import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import {
  getGmailClient,
  sendBccEmail,
  getUserEmail,
  getQuotaInfo
} from '@/lib/gmail';
import {
  getCampaignById,
  claimPendingRecipients,
  markRecipientsAsSent,
  markRecipientsAsFailed,
  updateCampaignStatus,
  updateCampaignCounts,
  updateLastBatchAt,
  updateNextBatchAt,
  getCampaignProgress,
  getCampaignImages,
  getUserTokens,
  getTodaySentCount,
  recordSentEmail
} from '@/lib/db';
import { scheduleNextBatch } from '@/lib/qstash';

type RouteContext = { params: Promise<{ id: string }> };

async function handler(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  const campaign = await getCampaignById(id);

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  if (campaign.status !== 'running') {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: `Campaign is ${campaign.status}`
    });
  }

  const tokens = await getUserTokens(campaign.user_email);
  if (!tokens) {
    await updateCampaignStatus(id, 'paused');
    return NextResponse.json({
      success: false,
      error: 'No valid tokens found - campaign paused'
    });
  }

  const gmail = getGmailClient(tokens.accessToken, tokens.refreshToken);
  const isWorkspace = !!tokens.hostedDomain;

  try {
    const [gmailQuota, dbSentCount] = await Promise.all([
      getQuotaInfo(gmail, isWorkspace),
      getTodaySentCount(campaign.user_email)
    ]);

    const sentToday = Math.max(gmailQuota.sentToday, dbSentCount);
    const limit = isWorkspace ? 1500 : 400;
    const remaining = Math.max(0, limit - sentToday);

    if (remaining < campaign.batch_size) {
      await updateCampaignStatus(id, 'paused');
      return NextResponse.json({
        success: false,
        error: 'Quota exhausted - campaign paused',
        quotaExhausted: true
      });
    }

    const claimedRecipients = await claimPendingRecipients(
      id,
      campaign.batch_size
    );

    if (claimedRecipients.length === 0) {
      const progress = await getCampaignProgress(id);
      if (progress.pending === 0 && progress.sending === 0) {
        await updateCampaignStatus(id, 'completed');
        return NextResponse.json({
          success: true,
          completed: true,
          message: 'Campaign completed'
        });
      }
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No recipients to process (another batch may be in progress)'
      });
    }

    const progress = await getCampaignProgress(id);
    const batchNumber = Math.floor(progress.sent / campaign.batch_size) + 1;
    const bccEmails = claimedRecipients.map(r => r.email);
    const recipientIds = claimedRecipients.map(r => r.id);

    const senderEmail = await getUserEmail(gmail);
    const images = await getCampaignImages(id);

    try {
      await sendBccEmail(
        gmail,
        senderEmail,
        bccEmails,
        campaign.subject,
        campaign.body,
        campaign.signature || undefined,
        images.length > 0
          ? images.map(img => ({
              contentId: img.content_id,
              filename: img.filename,
              mimeType: img.mime_type,
              base64Data: img.base64_data
            }))
          : undefined
      );

      await markRecipientsAsSent(recipientIds, batchNumber);

      await Promise.all(
        bccEmails.map(email => recordSentEmail(campaign.user_email, email, id))
      );

      await updateLastBatchAt(id);

      const newProgress = await getCampaignProgress(id);
      await updateCampaignCounts(id, newProgress.sent, newProgress.failed);

      const isCompleted = newProgress.pending === 0;
      if (isCompleted) {
        await updateCampaignStatus(id, 'completed');
        await updateNextBatchAt(id, null);
      } else {
        const nextBatchTime = new Date(
          Date.now() + campaign.batch_delay_seconds * 1000
        ).toISOString();
        await updateNextBatchAt(id, nextBatchTime);
        await scheduleNextBatch(id, campaign.batch_delay_seconds);
      }

      return NextResponse.json({
        success: true,
        batchNumber,
        sent: claimedRecipients.length,
        remaining: newProgress.pending,
        completed: isCompleted,
        nextBatchScheduled: !isCompleted
      });
    } catch (sendError) {
      const errorMessage =
        sendError instanceof Error ? sendError.message : 'Unknown send error';
      await markRecipientsAsFailed(recipientIds, errorMessage, batchNumber);

      const newProgress = await getCampaignProgress(id);
      await updateCampaignCounts(id, newProgress.sent, newProgress.failed);

      const isCompleted = newProgress.pending === 0;
      if (isCompleted) {
        await updateCampaignStatus(id, 'completed');
        await updateNextBatchAt(id, null);
      } else {
        const nextBatchTime = new Date(
          Date.now() + campaign.batch_delay_seconds * 1000
        ).toISOString();
        await updateNextBatchAt(id, nextBatchTime);
        await scheduleNextBatch(id, campaign.batch_delay_seconds);
      }

      return NextResponse.json({
        success: true,
        batchNumber,
        sent: 0,
        failed: claimedRecipients.length,
        error: errorMessage,
        remaining: newProgress.pending,
        completed: isCompleted,
        nextBatchScheduled: !isCompleted
      });
    }
  } catch (error) {
    console.error('Process batch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process batch' },
      { status: 500 }
    );
  }
}

export const POST = verifySignatureAppRouter(handler);
