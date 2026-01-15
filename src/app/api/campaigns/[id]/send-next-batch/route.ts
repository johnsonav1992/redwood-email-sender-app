import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getGmailClient, sendBccEmail, getUserEmail, getQuotaInfo } from '@/lib/gmail';
import {
  getCampaignById,
  claimPendingRecipients,
  markRecipientsAsSent,
  markRecipientsAsFailed,
  updateCampaignStatus,
  updateCampaignCounts,
  getCampaignProgress,
  getCampaignImages,
} from '@/lib/db';

interface SendBatchResponse {
  success: true;
  batchNumber: number;
  sent: number;
  failed: number;
  remaining: number;
  completed: boolean;
  quotaExhausted?: boolean;
}

interface ErrorResponse {
  success: false;
  error: string;
  quotaExhausted?: boolean;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse<SendBatchResponse | ErrorResponse>> {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session?.refreshToken || !session?.user?.email) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const campaign = await getCampaignById(id);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.user_email !== session.user.email) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (campaign.status !== 'running') {
      return NextResponse.json(
        { success: false, error: `Campaign is not running (status: ${campaign.status})` },
        { status: 400 }
      );
    }

    const gmail = getGmailClient(session.accessToken, session.refreshToken);
    const isWorkspace = !!session.hostedDomain;
    const quotaInfo = await getQuotaInfo(gmail, isWorkspace);

    if (quotaInfo.remaining < campaign.batch_size) {
      await updateCampaignStatus(id, 'paused');
      return NextResponse.json({
        success: false,
        error: `Daily quota exhausted. ${quotaInfo.remaining} emails remaining. Campaign paused.`,
        quotaExhausted: true,
      });
    }

    // Atomically claim recipients to prevent race conditions
    const claimedRecipients = await claimPendingRecipients(id, campaign.batch_size);

    if (claimedRecipients.length === 0) {
      // Check if there are any pending recipients left
      const progress = await getCampaignProgress(id);
      if (progress.pending === 0 && progress.sending === 0) {
        await updateCampaignStatus(id, 'completed');
        return NextResponse.json({
          success: true,
          batchNumber: 0,
          sent: 0,
          failed: 0,
          remaining: 0,
          completed: true,
        });
      }
      // Another process is handling recipients, or they're all claimed
      return NextResponse.json({
        success: true,
        batchNumber: 0,
        sent: 0,
        failed: 0,
        remaining: progress.pending,
        completed: false,
      });
    }

    const progress = await getCampaignProgress(id);
    const batchNumber = Math.floor(progress.sent / campaign.batch_size) + 1;

    const bccEmails = claimedRecipients.map((r) => r.email);
    const recipientIds = claimedRecipients.map((r) => r.id);

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
          ? images.map((img) => ({
              contentId: img.content_id,
              filename: img.filename,
              mimeType: img.mime_type,
              base64Data: img.base64_data,
            }))
          : undefined
      );

      await markRecipientsAsSent(recipientIds, batchNumber);

      const newProgress = await getCampaignProgress(id);
      await updateCampaignCounts(id, newProgress.sent, newProgress.failed);

      const isCompleted = newProgress.pending === 0;
      if (isCompleted) {
        await updateCampaignStatus(id, 'completed');
      }

      return NextResponse.json({
        success: true,
        batchNumber,
        sent: claimedRecipients.length,
        failed: 0,
        remaining: newProgress.pending,
        completed: isCompleted,
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
      }

      return NextResponse.json({
        success: true,
        batchNumber,
        sent: 0,
        failed: claimedRecipients.length,
        remaining: newProgress.pending,
        completed: isCompleted,
      });
    }
  } catch (error) {
    console.error('Send batch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send batch' },
      { status: 500 }
    );
  }
}
