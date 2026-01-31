'use server';

import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import {
  createCampaign as dbCreateCampaign,
  updateCampaignStatus as dbUpdateCampaignStatus,
  updateNextBatchAt,
  deleteCampaign as dbDeleteCampaign,
  duplicateCampaign as dbDuplicateCampaign,
  getCampaignById,
  getCampaignsByUser,
  initializeSchema,
  getTodaySentCount
} from '@/lib/db';
import {
  getGmailClient,
  getQuotaInfo,
  isAuthError,
  AUTH_ERROR_CODE,
  type QuotaInfo
} from '@/lib/gmail';
import { triggerImmediateBatch } from '@/lib/qstash';
import type { CampaignStatus, CampaignWithProgress } from '@/types/campaign';

let schemaInitialized = false;

async function ensureSchema() {
  if (!schemaInitialized) {
    await initializeSchema();
    schemaInitialized = true;
  }
}

export async function getInitialData(): Promise<{
  campaigns: CampaignWithProgress[];
  quota: QuotaInfo | null;
  error?: string;
}> {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.email ||
    !session?.accessToken ||
    !session?.refreshToken
  ) {
    return { campaigns: [], quota: null, error: 'Unauthorized' };
  }

  try {
    await ensureSchema();

    const gmail = getGmailClient(session.accessToken, session.refreshToken);
    const isWorkspace = !!session.hostedDomain;

    const [campaigns, gmailQuota, dbSentCount] = await Promise.all([
      getCampaignsByUser(session.user.email),
      getQuotaInfo(gmail, isWorkspace),
      getTodaySentCount(session.user.email)
    ]);

    const sentToday = Math.max(gmailQuota.sentToday, dbSentCount);
    const limit = isWorkspace ? 1500 : 400;
    const remaining = Math.max(0, limit - sentToday);

    return {
      campaigns,
      quota: {
        sentToday,
        limit,
        remaining,
        resetTime: gmailQuota.resetTime
      }
    };
  } catch (error) {
    console.error('Get initial data error:', error);
    if (isAuthError(error)) {
      return { campaigns: [], quota: null, error: AUTH_ERROR_CODE };
    }
    return { campaigns: [], quota: null, error: 'Failed to load data' };
  }
}

export async function fetchCampaigns(): Promise<{
  campaigns: CampaignWithProgress[];
  error?: string;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return { campaigns: [], error: 'Unauthorized' };
  }

  try {
    await ensureSchema();
    const campaigns = await getCampaignsByUser(session.user.email);
    return { campaigns };
  } catch (error) {
    console.error('Fetch campaigns error:', error);
    return { campaigns: [], error: 'Failed to fetch campaigns' };
  }
}

export async function fetchQuota(): Promise<{
  quota: QuotaInfo | null;
  error?: string;
}> {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.email ||
    !session?.accessToken ||
    !session?.refreshToken
  ) {
    return { quota: null, error: 'Unauthorized' };
  }

  try {
    const gmail = getGmailClient(session.accessToken, session.refreshToken);
    const isWorkspace = !!session.hostedDomain;

    const [gmailQuota, dbSentCount] = await Promise.all([
      getQuotaInfo(gmail, isWorkspace),
      getTodaySentCount(session.user.email)
    ]);

    const sentToday = Math.max(gmailQuota.sentToday, dbSentCount);
    const limit = isWorkspace ? 1500 : 400;
    const remaining = Math.max(0, limit - sentToday);

    return {
      quota: {
        sentToday,
        limit,
        remaining,
        resetTime: gmailQuota.resetTime
      }
    };
  } catch (error) {
    console.error('Fetch quota error:', error);
    if (isAuthError(error)) {
      return { quota: null, error: AUTH_ERROR_CODE };
    }
    return { quota: null, error: 'Failed to fetch quota' };
  }
}

export async function createCampaign(data: {
  name?: string;
  subject: string;
  htmlBody: string;
  signature?: string;
  toEmail?: string;
  batchSize?: number;
  batchDelaySeconds?: number;
  recipients: string[];
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return { error: 'Unauthorized' };
  }

  try {
    await ensureSchema();

    const campaign = await dbCreateCampaign({
      user_email: session.user.email,
      name: data.name || `Campaign ${new Date().toLocaleDateString()}`,
      subject: data.subject,
      body: data.htmlBody,
      signature: data.signature,
      to_email: data.toEmail,
      batch_size: data.batchSize || 30,
      batch_delay_seconds: data.batchDelaySeconds || 60,
      recipients: data.recipients
    });

    revalidatePath('/compose');
    revalidatePath('/campaigns');
    return { campaign: { ...campaign, pending_count: data.recipients.length } };
  } catch (error) {
    console.error('Create campaign error:', error);
    return { error: 'Failed to create campaign' };
  }
}

export async function updateCampaignStatus(id: string, status: CampaignStatus) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return { error: 'Unauthorized' };
  }

  try {
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return { error: 'Campaign not found' };
    }
    if (campaign.user_email !== session.user.email) {
      return { error: 'Forbidden' };
    }

    await dbUpdateCampaignStatus(id, status);

    if (status === 'running') {
      console.log(`[Campaign] Starting campaign ${id}, triggering QStash...`);
      try {
        const messageId = await triggerImmediateBatch(id);
        console.log(`[Campaign] QStash triggered, messageId: ${messageId}`);
      } catch (qstashError) {
        console.error(`[Campaign] QStash trigger failed:`, qstashError);
      }
    } else if (status === 'paused' || status === 'stopped') {
      await updateNextBatchAt(id, null);
    }

    revalidatePath('/compose');
    revalidatePath('/campaigns');
    return { success: true };
  } catch (error) {
    console.error('Update campaign status error:', error);
    return { error: 'Failed to update campaign' };
  }
}

export async function deleteCampaign(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return { error: 'Unauthorized' };
  }

  try {
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return { error: 'Campaign not found' };
    }
    if (campaign.user_email !== session.user.email) {
      return { error: 'Forbidden' };
    }

    await dbDeleteCampaign(id);
    revalidatePath('/compose');
    revalidatePath('/campaigns');
    return { success: true };
  } catch (error) {
    console.error('Delete campaign error:', error);
    return { error: 'Failed to delete campaign' };
  }
}

export async function duplicateCampaign(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return { error: 'Unauthorized' };
  }

  try {
    await ensureSchema();

    const campaign = await dbDuplicateCampaign(id, session.user.email);
    if (!campaign) {
      return { error: 'Campaign not found or access denied' };
    }

    revalidatePath('/compose');
    revalidatePath('/campaigns');
    return { campaign: { ...campaign, pending_count: 0 } };
  } catch (error) {
    console.error('Duplicate campaign error:', error);
    return { error: 'Failed to duplicate campaign' };
  }
}
