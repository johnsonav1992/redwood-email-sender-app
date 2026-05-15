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
  getCampaignProgress,
  getCampaignById,
  getCampaignsByUser,
  ensureSchema,
  getTodaySentCount,
  getUserTokens
} from '@/lib/db';
import {
  getGmailClient,
  getUserEmail,
  getQuotaInfo,
  isAuthError,
  AUTH_ERROR_CODE,
  type QuotaInfo
} from '@/lib/gmail';
import { logError, logInfo, logWarn } from '@/lib/logger';
import { triggerImmediateBatch } from '@/lib/qstash';
import type { CampaignStatus, CampaignWithProgress } from '@/types/campaign';

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
    const limit = isWorkspace ? 2000 : 500;
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
    const limit = isWorkspace ? 2000 : 500;
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
    logWarn('campaign.action_create_unauthorized');
    return { error: 'Unauthorized' };
  }

  try {
    await ensureSchema();

    const startedAt = Date.now();
    logInfo('campaign.action_create_start', {
      userEmail: session.user.email,
      recipientCount: data.recipients.length,
      batchSize: data.batchSize || 30,
      batchDelaySeconds: data.batchDelaySeconds || 60,
      hasSignature: !!data.signature,
      hasToEmail: !!data.toEmail,
      subjectLength: data.subject.length,
      bodyLength: data.htmlBody.length
    });

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

    logInfo('campaign.action_create_success', {
      campaignId: campaign.id,
      userEmail: session.user.email,
      recipientCount: data.recipients.length,
      durationMs: Date.now() - startedAt
    });

    revalidatePath('/compose');
    revalidatePath('/campaigns');
    return { campaign: { ...campaign, pending_count: data.recipients.length } };
  } catch (error) {
    logError(
      'campaign.action_create_failed',
      {
        userEmail: session.user.email,
        recipientCount: data.recipients.length,
        batchSize: data.batchSize || 30,
        batchDelaySeconds: data.batchDelaySeconds || 60
      },
      error
    );
    return { error: 'Failed to create campaign' };
  }
}

export async function updateCampaignStatus(id: string, status: CampaignStatus) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    logWarn('campaign.action_status_unauthorized', { campaignId: id, status });
    return { error: 'Unauthorized' };
  }

  try {
    const startedAt = Date.now();
    logInfo('campaign.action_status_start', {
      campaignId: id,
      userEmail: session.user.email,
      requestedStatus: status
    });

    const campaign = await getCampaignById(id);
    if (!campaign) {
      logWarn('campaign.action_status_not_found', {
        campaignId: id,
        userEmail: session.user.email,
        requestedStatus: status
      });
      return { error: 'Campaign not found' };
    }
    if (campaign.user_email !== session.user.email) {
      logWarn('campaign.action_status_forbidden', {
        campaignId: id,
        userEmail: session.user.email,
        ownerEmail: campaign.user_email,
        requestedStatus: status
      });
      return { error: 'Forbidden' };
    }

    if (status === 'running') {
      if (!session.accessToken || !session.refreshToken) {
        logWarn('campaign.action_status_missing_session_tokens', {
          campaignId: id,
          userEmail: session.user.email
        });
        return {
          error:
            'Your Google authorization is incomplete. Please sign out and sign in again with Gmail access.'
        };
      }

      const tokens = await getUserTokens(session.user.email);
      if (!tokens) {
        logWarn('campaign.action_status_missing_stored_tokens', {
          campaignId: id,
          userEmail: session.user.email
        });
        return {
          error:
            'The app does not have saved Gmail access for this account. Please sign out and sign in again.'
        };
      }

      try {
        const gmail = getGmailClient(session.accessToken, session.refreshToken);
        const gmailAccountEmail = await getUserEmail(gmail);

        if (
          gmailAccountEmail.toLowerCase() !== session.user.email.toLowerCase()
        ) {
          logWarn('campaign.action_status_account_mismatch', {
            campaignId: id,
            sessionUserEmail: session.user.email,
            gmailAccountEmail
          });
          return {
            error:
              'Signed-in account does not match the connected Gmail account. Please sign out and sign in with the correct Google account.'
          };
        }
      } catch (authCheckError) {
        logError(
          'campaign.action_status_gmail_check_failed',
          {
            campaignId: id,
            userEmail: session.user.email
          },
          authCheckError
        );
        if (isAuthError(authCheckError)) {
          return {
            error:
              'Google authorization expired or was revoked. Please sign out and sign in again.'
          };
        }
        return {
          error:
            'Could not verify Gmail access for this account. Please try signing out and back in.'
        };
      }

      const progress = await getCampaignProgress(id);
      logInfo('campaign.action_status_start_guard', {
        campaignId: id,
        userEmail: session.user.email,
        campaignStatus: campaign.status,
        totalRecipients: campaign.total_recipients,
        progressTotal: progress.total,
        pending: progress.pending,
        sending: progress.sending,
        sent: progress.sent,
        failed: progress.failed
      });
      if (progress.total !== campaign.total_recipients) {
        logWarn('campaign.action_status_incomplete_recipients', {
          campaignId: id,
          userEmail: session.user.email,
          totalRecipients: campaign.total_recipients,
          progressTotal: progress.total
        });
        return {
          error:
            'Recipient list is incomplete. Please re-upload the recipients before starting this campaign.'
        };
      }
    }

    await dbUpdateCampaignStatus(id, status);

    if (status === 'running') {
      logInfo('campaign.action_status_trigger_qstash_start', {
        campaignId: id,
        userEmail: session.user.email
      });
      try {
        const messageId = await triggerImmediateBatch(id);
        if (!messageId) {
          await dbUpdateCampaignStatus(id, campaign.status);
          logError('campaign.action_status_trigger_qstash_missing_message_id', {
            campaignId: id,
            userEmail: session.user.email
          });
          return {
            error:
              'Campaign could not start because background sending is not configured. Please contact support.'
          };
        }
        logInfo('campaign.action_status_trigger_qstash_success', {
          campaignId: id,
          userEmail: session.user.email,
          messageId
        });
      } catch (qstashError) {
        await dbUpdateCampaignStatus(id, campaign.status);
        logError(
          'campaign.action_status_trigger_qstash_failed',
          {
            campaignId: id,
            userEmail: session.user.email
          },
          qstashError
        );
        return {
          error:
            'Campaign could not start because background sending failed to queue. Please try again.'
        };
      }
    } else if (status === 'paused' || status === 'stopped') {
      await updateNextBatchAt(id, null);
    }

    revalidatePath('/compose');
    revalidatePath('/campaigns');
    logInfo('campaign.action_status_success', {
      campaignId: id,
      userEmail: session.user.email,
      previousStatus: campaign.status,
      newStatus: status,
      durationMs: Date.now() - startedAt
    });
    return { success: true };
  } catch (error) {
    logError(
      'campaign.action_status_failed',
      {
        campaignId: id,
        userEmail: session.user.email,
        requestedStatus: status
      },
      error
    );
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
