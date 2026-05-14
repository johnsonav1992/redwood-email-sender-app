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
  releaseClaimedRecipients,
  updateCampaignStatus,
  updateCampaignCounts,
  updateLastBatchAt,
  updateNextBatchAt,
  getCampaignProgress,
  getUserTokens,
  getTodaySentCount,
  recordSentEmail,
  cleanupOldSentEmails
} from '@/lib/db';
import { logError, logInfo, logWarn } from '@/lib/logger';
import { scheduleNextBatch } from '@/lib/qstash';

type RouteContext = { params: Promise<{ id: string }> };

async function handler(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  logInfo('campaign.process_start', {
    requestId,
    campaignId: id
  });

  // Clean up old sent_emails records (fire-and-forget)
  cleanupOldSentEmails().catch(err =>
    logError('campaign.process_cleanup_old_sent_failed', { requestId }, err)
  );

  const campaign = await getCampaignById(id);

  if (!campaign) {
    logWarn('campaign.process_not_found', {
      requestId,
      campaignId: id
    });
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  logInfo('campaign.process_loaded', {
    requestId,
    campaignId: id,
    userEmail: campaign.user_email,
    status: campaign.status,
    totalRecipients: campaign.total_recipients,
    sentCount: campaign.sent_count,
    failedCount: campaign.failed_count,
    batchSize: campaign.batch_size,
    batchDelaySeconds: campaign.batch_delay_seconds
  });

  if (campaign.status !== 'running') {
    logInfo('campaign.process_skipped_not_running', {
      requestId,
      campaignId: id,
      userEmail: campaign.user_email,
      status: campaign.status
    });
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: `Campaign is ${campaign.status}`
    });
  }

  const tokens = await getUserTokens(campaign.user_email);
  if (!tokens) {
    await updateCampaignStatus(id, 'paused');
    logWarn('campaign.process_missing_tokens_paused', {
      requestId,
      campaignId: id,
      userEmail: campaign.user_email
    });
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
    const limit = isWorkspace ? 2000 : 500;
    const remaining = Math.max(0, limit - sentToday);

    logInfo('campaign.process_quota_checked', {
      requestId,
      campaignId: id,
      userEmail: campaign.user_email,
      isWorkspace,
      gmailSentToday: gmailQuota.sentToday,
      dbSentCount,
      sentToday,
      limit,
      remaining,
      batchSize: campaign.batch_size
    });

    if (remaining < campaign.batch_size) {
      await updateCampaignStatus(id, 'paused');
      logWarn('campaign.process_quota_exhausted_paused', {
        requestId,
        campaignId: id,
        userEmail: campaign.user_email,
        remaining,
        batchSize: campaign.batch_size
      });
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

    logInfo('campaign.process_claimed_recipients', {
      requestId,
      campaignId: id,
      userEmail: campaign.user_email,
      claimedCount: claimedRecipients.length,
      batchSize: campaign.batch_size
    });

    if (claimedRecipients.length === 0) {
      const progress = await getCampaignProgress(id);
      if (progress.pending === 0 && progress.sending === 0) {
        await updateCampaignStatus(id, 'completed');
        logInfo('campaign.process_completed_no_pending', {
          requestId,
          campaignId: id,
          userEmail: campaign.user_email,
          sent: progress.sent,
          failed: progress.failed,
          durationMs: Date.now() - startedAt
        });
        return NextResponse.json({
          success: true,
          completed: true,
          message: 'Campaign completed'
        });
      }
      logInfo('campaign.process_skipped_no_claims', {
        requestId,
        campaignId: id,
        userEmail: campaign.user_email,
        pending: progress.pending,
        sending: progress.sending
      });
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

    if (senderEmail.toLowerCase() !== campaign.user_email.toLowerCase()) {
      await releaseClaimedRecipients(recipientIds);
      await updateCampaignStatus(id, 'paused');
      await updateNextBatchAt(id, null);
      logWarn('campaign.process_sender_mismatch_paused', {
        requestId,
        campaignId: id,
        campaignUserEmail: campaign.user_email,
        senderEmail
      });
      return NextResponse.json({
        success: false,
        error:
          'Connected Gmail account does not match the campaign owner. Campaign paused until the correct account signs in again.'
      });
    }

    const toEmail = campaign.to_email || senderEmail;

    logInfo('campaign.process_send_attempt', {
      requestId,
      campaignId: id,
      userEmail: campaign.user_email,
      batchNumber,
      recipientCount: claimedRecipients.length,
      progressSent: progress.sent,
      progressPending: progress.pending,
      senderEmail,
      toEmail,
      subjectLength: campaign.subject.length,
      bodyLength: campaign.body.length,
      hasSignature: !!campaign.signature
    });

    try {
      await sendBccEmail(
        gmail,
        senderEmail,
        toEmail,
        bccEmails,
        campaign.subject,
        campaign.body,
        campaign.signature || undefined
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
        logInfo('campaign.process_batch_sent_completed', {
          requestId,
          campaignId: id,
          userEmail: campaign.user_email,
          batchNumber,
          sent: claimedRecipients.length,
          totalSent: newProgress.sent,
          failed: newProgress.failed,
          durationMs: Date.now() - startedAt
        });
      } else {
        const nextBatchTime = new Date(
          Date.now() + campaign.batch_delay_seconds * 1000
        ).toISOString();
        await updateNextBatchAt(id, nextBatchTime);
        const nextMessageId = await scheduleNextBatch(
          id,
          campaign.batch_delay_seconds
        );
        logInfo('campaign.process_batch_sent_scheduled_next', {
          requestId,
          campaignId: id,
          userEmail: campaign.user_email,
          batchNumber,
          sent: claimedRecipients.length,
          remaining: newProgress.pending,
          failed: newProgress.failed,
          nextBatchAt: nextBatchTime,
          nextMessageId,
          durationMs: Date.now() - startedAt
        });
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
      logError(
        'campaign.process_send_failed',
        {
          requestId,
          campaignId: id,
          userEmail: campaign.user_email,
          batchNumber,
          recipientCount: claimedRecipients.length
        },
        sendError
      );
      await markRecipientsAsFailed(recipientIds, errorMessage, batchNumber);

      const newProgress = await getCampaignProgress(id);
      await updateCampaignCounts(id, newProgress.sent, newProgress.failed);

      const isCompleted = newProgress.pending === 0;
      if (isCompleted) {
        await updateCampaignStatus(id, 'completed');
        await updateNextBatchAt(id, null);
        logInfo('campaign.process_failed_batch_completed_campaign', {
          requestId,
          campaignId: id,
          userEmail: campaign.user_email,
          batchNumber,
          failed: claimedRecipients.length,
          totalSent: newProgress.sent,
          totalFailed: newProgress.failed,
          durationMs: Date.now() - startedAt
        });
      } else {
        const nextBatchTime = new Date(
          Date.now() + campaign.batch_delay_seconds * 1000
        ).toISOString();
        await updateNextBatchAt(id, nextBatchTime);
        const nextMessageId = await scheduleNextBatch(
          id,
          campaign.batch_delay_seconds
        );
        logInfo('campaign.process_failed_batch_scheduled_next', {
          requestId,
          campaignId: id,
          userEmail: campaign.user_email,
          batchNumber,
          failed: claimedRecipients.length,
          remaining: newProgress.pending,
          nextBatchAt: nextBatchTime,
          nextMessageId,
          durationMs: Date.now() - startedAt
        });
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
    logError(
      'campaign.process_failed',
      {
        requestId,
        campaignId: id,
        userEmail: campaign.user_email,
        durationMs: Date.now() - startedAt
      },
      error
    );
    return NextResponse.json(
      { success: false, error: 'Failed to process batch' },
      { status: 500 }
    );
  }
}

export const POST = verifySignatureAppRouter(handler);
