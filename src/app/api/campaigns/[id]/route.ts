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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.user_email !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [recipientsResult, progress] = await Promise.all([
      getRecipientsByCampaign(id, { status: status || 'all', limit, offset }),
      getCampaignProgress(id)
    ]);

    return NextResponse.json({
      campaign,
      recipients: recipientsResult.recipients,
      recipientsTotal: recipientsResult.total,
      progress
    });
  } catch (error) {
    console.error('Failed to fetch campaign:', error);
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

    if (status) {
      const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
        draft: ['running', 'stopped'],
        running: ['paused', 'stopped', 'completed'],
        paused: ['running', 'stopped'],
        completed: [],
        stopped: []
      };

      if (!validTransitions[campaign.status]?.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${campaign.status} to ${status}` },
          { status: 400 }
        );
      }

      await updateCampaignStatus(id, status);

      if (status === 'running') {
        console.log(`[Campaign] Starting campaign ${id}, triggering QStash...`);
        try {
          const messageId = await triggerImmediateBatch(id);
          console.log(`[Campaign] QStash triggered, messageId: ${messageId}`);
        } catch (qstashError) {
          console.error(`[Campaign] QStash trigger failed:`, qstashError);
        }
      }
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update campaign:', error);
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
