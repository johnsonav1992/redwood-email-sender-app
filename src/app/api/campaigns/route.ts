import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  createCampaign,
  getCampaignsByUser,
  initializeSchema,
} from '@/lib/db';
import type { CreateCampaignInput, CampaignWithProgress } from '@/types/campaign';

interface ListResponse {
  campaigns: CampaignWithProgress[];
}

interface CreateResponse {
  campaign: CampaignWithProgress;
}

interface ErrorResponse {
  error: string;
}

let schemaInitialized = false;

async function ensureSchema() {
  if (!schemaInitialized) {
    await initializeSchema();
    schemaInitialized = true;
  }
}

export async function GET(): Promise<NextResponse<ListResponse | ErrorResponse>> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureSchema();
    const campaigns = await getCampaignsByUser(session.user.email);
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<CreateResponse | ErrorResponse>> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureSchema();

    const body = await req.json();
    const { name, subject, htmlBody, signature, batchSize, batchDelaySeconds, recipients } = body;

    if (!subject || !htmlBody || !recipients || recipients.length === 0) {
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
      recipients,
    };

    const campaign = await createCampaign(input);

    return NextResponse.json({
      campaign: { ...campaign, pending_count: recipients.length },
    });
  } catch (error) {
    console.error('Failed to create campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
