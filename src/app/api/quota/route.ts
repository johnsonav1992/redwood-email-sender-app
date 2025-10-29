import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getGmailClient } from '@/lib/gmail';

interface QuotaResponse {
  sentToday: number;
  limit: number;
  remaining: number;
  resetTime: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export async function GET(): Promise<
  NextResponse<QuotaResponse | ErrorResponse>
> {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session?.refreshToken) {
    return NextResponse.json<ErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const gmail = getGmailClient(session.accessToken, session.refreshToken);

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}/${month}/${day}`;

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `in:sent after:${dateStr}`,
      maxResults: 500
    });

    const sentToday =
      response.data.messages?.length || response.data.resultSizeEstimate || 0;

    // Determine daily limit based on account type
    // Workspace (has hostedDomain): 1500 (conservative, actual is 2000 for paid)
    // Regular Gmail: 400 (conservative, actual is 500)
    const dailyLimit = session.hostedDomain ? 1500 : 400;
    const remaining = Math.max(0, dailyLimit - sentToday);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return NextResponse.json<QuotaResponse>({
      sentToday,
      limit: dailyLimit,
      remaining,
      resetTime: tomorrow.toISOString()
    });
  } catch (error) {
    console.error('Error fetching quota:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json<ErrorResponse>(
      { error: 'Failed to fetch quota', details: errorMessage },
      { status: 500 }
    );
  }
}
