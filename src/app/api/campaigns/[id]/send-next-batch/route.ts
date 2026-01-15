import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getGmailClient, sendBccEmail, getUserEmail, getQuotaInfo } from '@/lib/gmail';
import {
  getCampaignById,
  getPendingRecipients,
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

    const pendingRecipients = await getPendingRecipients(id, campaign.batch_size);

    if (pendingRecipients.length === 0) {
      await updateCampaignStatus(id, 'completed');
      const progress = await getCampaignProgress(id);
      return NextResponse.json({
        success: true,
        batchNumber: 0,
        sent: 0,
        failed: 0,
        remaining: 0,
        completed: true,
      });
    }

    const progress = await getCampaignProgress(id);
    const batchNumber = Math.floor(progress.sent / campaign.batch_size) + 1;

    const bccEmails = pendingRecipients.map((r) => r.email);
    const recipientIds = pendingRecipients.map((r) => r.id);

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
        sent: pendingRecipients.length,
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
        failed: pendingRecipients.length,
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
