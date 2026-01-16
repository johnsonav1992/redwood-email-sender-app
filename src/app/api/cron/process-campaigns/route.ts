import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getGmailClient, sendBccEmail, getUserEmail, getQuotaInfo } from '@/lib/gmail';
import {
  claimPendingRecipients,
  markRecipientsAsSent,
  markRecipientsAsFailed,
  updateCampaignStatus,
  updateCampaignCounts,
  getCampaignProgress,
  getCampaignImages,
  getUserTokens,
  getTodaySentCount,
} from '@/lib/db';
import type { Campaign } from '@/types/campaign';

async function getRunningCampaigns(): Promise<Campaign[]> {
  const result = await db.execute({
    sql: `SELECT * FROM campaigns WHERE status = 'running' ORDER BY updated_at ASC LIMIT 10`,
    args: [],
  });
  return result.rows as unknown as Campaign[];
}

async function processCampaign(campaign: Campaign): Promise<{ sent: number; failed: number; completed: boolean; error?: string }> {
  const tokens = await getUserTokens(campaign.user_email);
  if (!tokens) {
    await updateCampaignStatus(campaign.id, 'paused');
    return { sent: 0, failed: 0, completed: false, error: 'No valid tokens found' };
  }

  const gmail = getGmailClient(tokens.accessToken, tokens.refreshToken);
  const isWorkspace = !!tokens.hostedDomain;

  try {
    // Get both Gmail API count and DB count for accurate quota checking
    const [gmailQuota, dbSentCount] = await Promise.all([
      getQuotaInfo(gmail, isWorkspace),
      getTodaySentCount(campaign.user_email),
    ]);

    // Use the higher count to be conservative (DB is more accurate for BCC emails)
    const sentToday = Math.max(gmailQuota.sentToday, dbSentCount);
    const limit = isWorkspace ? 1500 : 400;
    const remaining = Math.max(0, limit - sentToday);

    if (remaining < campaign.batch_size) {
      await updateCampaignStatus(campaign.id, 'paused');
      return { sent: 0, failed: 0, completed: false, error: 'Quota exhausted' };
    }

    // Atomically claim recipients to prevent race conditions
    const claimedRecipients = await claimPendingRecipients(campaign.id, campaign.batch_size);
    if (claimedRecipients.length === 0) {
      // Check if campaign is complete
      const progress = await getCampaignProgress(campaign.id);
      if (progress.pending === 0 && progress.sending === 0) {
        await updateCampaignStatus(campaign.id, 'completed');
        return { sent: 0, failed: 0, completed: true };
      }
      // Another process is handling recipients
      return { sent: 0, failed: 0, completed: false };
    }

    const progress = await getCampaignProgress(campaign.id);
    const batchNumber = Math.floor(progress.sent / campaign.batch_size) + 1;
    const bccEmails = claimedRecipients.map((r) => r.email);
    const recipientIds = claimedRecipients.map((r) => r.id);

    const senderEmail = await getUserEmail(gmail);
    const images = await getCampaignImages(campaign.id);

    try {
      await sendBccEmail(
        gmail,
        senderEmail,
        bccEmails,
        campaign.subject,
        campaign.body,
        campaign.signature || undefined,
        images.length > 0
          ? images.map((img) => ({
              contentId: img.content_id,
              filename: img.filename,
              mimeType: img.mime_type,
              base64Data: img.base64_data,
            }))
          : undefined
      );

      await markRecipientsAsSent(recipientIds, batchNumber);
      const newProgress = await getCampaignProgress(campaign.id);
      await updateCampaignCounts(campaign.id, newProgress.sent, newProgress.failed);

      const isCompleted = newProgress.pending === 0;
      if (isCompleted) {
        await updateCampaignStatus(campaign.id, 'completed');
      }

      return { sent: claimedRecipients.length, failed: 0, completed: isCompleted };
    } catch (sendError) {
      const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown send error';
      await markRecipientsAsFailed(recipientIds, errorMessage, batchNumber);

      const newProgress = await getCampaignProgress(campaign.id);
      await updateCampaignCounts(campaign.id, newProgress.sent, newProgress.failed);

      const isCompleted = newProgress.pending === 0;
      if (isCompleted) {
        await updateCampaignStatus(campaign.id, 'completed');
      }

      return { sent: 0, failed: claimedRecipients.length, completed: isCompleted, error: errorMessage };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { sent: 0, failed: 0, completed: false, error: errorMessage };
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const campaigns = await getRunningCampaigns();
    const results: Record<string, { sent: number; failed: number; completed: boolean; error?: string }> = {};

    for (const campaign of campaigns) {
      results[campaign.id] = await processCampaign(campaign);
    }

    return NextResponse.json({
      processed: campaigns.length,
      results,
    });
  } catch (error) {
    console.error('Cron process error:', error);
    return NextResponse.json({ error: 'Failed to process campaigns' }, { status: 500 });
  }
}
