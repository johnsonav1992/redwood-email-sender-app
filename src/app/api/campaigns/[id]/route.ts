import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import {
  getCampaignById,
  getRecipientsByCampaign,
  getCampaignProgress,
  updateCampaignStatus,
  deleteCampaign,
  updateCampaignDraft
} from '@/lib/db';
import { logError, logInfo, logWarn } from '@/lib/logger';
import { triggerImmediateBatch } from '@/lib/qstash';
import type { Campaign, Recipient, CampaignStatus } from '@/types/campaign';

interface GetResponse {
  campaign: Campaign;
  recipients: Recipient[];
  recipientsTotal: number;
  progress: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
}

interface PatchResponse {
  success: true;
}

interface DeleteResponse {
  success: true;
}

interface ErrorResponse {
  error: string;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<GetResponse | ErrorResponse>> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    logWarn('campaign.api_get_unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startedAt = Date.now();
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status') as
      | 'all'
      | 'sent'
      | 'pending'
      | 'failed'
      | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const campaign = await getCampaignById(id);

    if (!campaign) {
      logWarn('campaign.api_get_not_found', {
        campaignId: id,
        userEmail: session.user.email
      });
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.user_email !== session.user.email) {
      logWarn('campaign.api_get_forbidden', {
        campaignId: id,
        userEmail: session.user.email,
        ownerEmail: campaign.user_email
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [recipientsResult, progress] = await Promise.all([
      getRecipientsByCampaign(id, { status: status || 'all', limit, offset }),
      getCampaignProgress(id)
    ]);

    logInfo('campaign.api_get_success', {
      campaignId: id,
      userEmail: session.user.email,
      requestedRecipientStatus: status || 'all',
      limit,
      offset,
      returnedRecipients: recipientsResult.recipients.length,
      recipientsTotal: recipientsResult.total,
      progressTotal: progress.total,
      sent: progress.sent,
      failed: progress.failed,
      pending: progress.pending,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json({
      campaign,
      recipients: recipientsResult.recipients,
      recipientsTotal: recipientsResult.total,
      progress
    });
  } catch (error) {
    logError('campaign.api_get_failed', { userEmail: session.user.email }, error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<PatchResponse | ErrorResponse>> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    logWarn('campaign.api_patch_unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startedAt = Date.now();
    const { id } = await context.params;
    const campaign = await getCampaignById(id);

    if (!campaign) {
      logWarn('campaign.api_patch_not_found', {
        campaignId: id,
        userEmail: session.user.email
      });
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.user_email !== session.user.email) {
      logWarn('campaign.api_patch_forbidden', {
        campaignId: id,
        userEmail: session.user.email,
        ownerEmail: campaign.user_email
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      status,
      name,
      subject,
      body: emailBody,
      signature,
      to_email,
      batch_size,
      batch_delay_seconds,
      recipients
    } = body as {
      status?: CampaignStatus;
      name?: string;
      subject?: string;
      body?: string;
      signature?: string;
      to_email?: string;
      batch_size?: number;
      batch_delay_seconds?: number;
      recipients?: string[];
    };

    logInfo('campaign.api_patch_start', {
      campaignId: id,
      userEmail: session.user.email,
      currentStatus: campaign.status,
      requestedStatus: status,
      updatesContent:
        name !== undefined ||
        subject !== undefined ||
        emailBody !== undefined ||
        signature !== undefined ||
        to_email !== undefined,
      updatesBatch:
        batch_size !== undefined || batch_delay_seconds !== undefined,
      updatesRecipients: recipients !== undefined,
      recipientCount: recipients?.length,
      subjectLength: subject?.length,
      bodyLength: emailBody?.length
    });

    if (status) {
      const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
        draft: ['running', 'stopped'],
        running: ['paused', 'stopped', 'completed'],
        paused: ['running', 'stopped'],
        completed: [],
        stopped: []
      };

      if (!validTransitions[campaign.status]?.includes(status)) {
        logWarn('campaign.api_patch_invalid_transition', {
          campaignId: id,
          userEmail: session.user.email,
          fromStatus: campaign.status,
          toStatus: status
        });
        return NextResponse.json(
          { error: `Cannot transition from ${campaign.status} to ${status}` },
          { status: 400 }
        );
      }

      if (status === 'running') {
        const progress = await getCampaignProgress(id);
        logInfo('campaign.api_patch_start_guard', {
          campaignId: id,
          userEmail: session.user.email,
          totalRecipients: campaign.total_recipients,
          progressTotal: progress.total,
          pending: progress.pending,
          sending: progress.sending,
          sent: progress.sent,
          failed: progress.failed
        });
        if (progress.total !== campaign.total_recipients) {
          logWarn('campaign.api_patch_incomplete_recipients', {
            campaignId: id,
            userEmail: session.user.email,
            totalRecipients: campaign.total_recipients,
            progressTotal: progress.total
          });
          return NextResponse.json(
            {
              error:
                'Recipient list is incomplete. Please re-upload the recipients before starting this campaign.'
            },
            { status: 409 }
          );
        }
      }

      await updateCampaignStatus(id, status);

      if (status === 'running') {
        logInfo('campaign.api_patch_trigger_qstash_start', {
          campaignId: id,
          userEmail: session.user.email
        });
        try {
          const messageId = await triggerImmediateBatch(id);
          logInfo('campaign.api_patch_trigger_qstash_success', {
            campaignId: id,
            userEmail: session.user.email,
            messageId
          });
        } catch (qstashError) {
          logError(
            'campaign.api_patch_trigger_qstash_failed',
            {
              campaignId: id,
              userEmail: session.user.email
            },
            qstashError
          );
        }
      }

      revalidatePath('/compose');
      revalidatePath('/campaigns');
    }

    if (
      campaign.status === 'draft' &&
      (name !== undefined ||
        subject !== undefined ||
        emailBody !== undefined ||
        signature !== undefined ||
        to_email !== undefined ||
        batch_size !== undefined ||
        batch_delay_seconds !== undefined ||
        recipients !== undefined)
    ) {
      await updateCampaignDraft(id, {
        name,
        subject,
        body: emailBody,
        signature,
        to_email,
        batch_size,
        batch_delay_seconds,
        recipients
      });
      revalidatePath('/compose');
      revalidatePath('/campaigns');
    }

    logInfo('campaign.api_patch_success', {
      campaignId: id,
      userEmail: session.user.email,
      requestedStatus: status,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('campaign.api_patch_failed', { userEmail: session.user.email }, error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse<DeleteResponse | ErrorResponse>> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const campaign = await getCampaignById(id);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.user_email !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (campaign.status === 'running') {
      return NextResponse.json(
        { error: 'Cannot delete a running campaign. Stop it first.' },
        { status: 400 }
      );
    }

    await deleteCampaign(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
