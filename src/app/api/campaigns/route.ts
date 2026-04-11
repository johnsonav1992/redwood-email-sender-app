import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createCampaign, getCampaignsByUser, ensureSchema } from '@/lib/db';
import { logError, logInfo, logWarn } from '@/lib/logger';
import type {
  CreateCampaignInput,
  CampaignWithProgress
} from '@/types/campaign';

interface ListResponse {
  campaigns: CampaignWithProgress[];
}

interface CreateResponse {
  campaign: CampaignWithProgress;
}

interface ErrorResponse {
  error: string;
}

export async function GET(): Promise<
  NextResponse<ListResponse | ErrorResponse>
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    logWarn('campaigns.api_list_unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startedAt = Date.now();
    await ensureSchema();
    const campaigns = await getCampaignsByUser(session.user.email);
    logInfo('campaigns.api_list_success', {
      userEmail: session.user.email,
      campaignCount: campaigns.length,
      durationMs: Date.now() - startedAt
    });
    return NextResponse.json({ campaigns });
  } catch (error) {
    logError(
      'campaigns.api_list_failed',
      { userEmail: session.user.email },
      error
    );
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<CreateResponse | ErrorResponse>> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    logWarn('campaigns.api_create_unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startedAt = Date.now();
    await ensureSchema();

    const body = await req.json();
    const {
      name,
      subject,
      htmlBody,
      signature,
      batchSize,
      batchDelaySeconds,
      recipients
    } = body;

    if (!subject || !htmlBody || !recipients || recipients.length === 0) {
      logWarn('campaigns.api_create_validation_failed', {
        userEmail: session.user.email,
        hasSubject: !!subject,
        hasHtmlBody: !!htmlBody,
        hasRecipients: !!recipients,
        recipientCount: Array.isArray(recipients) ? recipients.length : null
      });
      return NextResponse.json(
        { error: 'Missing required fields: subject, htmlBody, recipients' },
        { status: 400 }
      );
    }

    const input: CreateCampaignInput = {
      user_email: session.user.email,
      name,
      subject,
      body: htmlBody,
      signature,
      batch_size: batchSize,
      batch_delay_seconds: batchDelaySeconds,
      recipients
    };

    logInfo('campaigns.api_create_start', {
      userEmail: session.user.email,
      recipientCount: recipients.length,
      batchSize,
      batchDelaySeconds,
      hasSignature: !!signature,
      subjectLength: subject.length,
      bodyLength: htmlBody.length
    });

    const campaign = await createCampaign(input);

    logInfo('campaigns.api_create_success', {
      campaignId: campaign.id,
      userEmail: session.user.email,
      recipientCount: recipients.length,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json({
      campaign: { ...campaign, pending_count: recipients.length }
    });
  } catch (error) {
    logError(
      'campaigns.api_create_failed',
      { userEmail: session.user.email },
      error
    );
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
