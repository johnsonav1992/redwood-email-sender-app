import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getGmailClient,
  getQuotaInfo,
  isAuthError,
  type QuotaInfo
} from '@/lib/gmail';
import { getTodaySentCount } from '@/lib/db';

interface ErrorResponse {
  error: string;
  details?: string;
}

export async function GET(): Promise<NextResponse<QuotaInfo | ErrorResponse>> {
  const session = await getServerSession(authOptions);

  if (
    !session?.accessToken ||
    !session?.refreshToken ||
    !session?.user?.email
  ) {
    return NextResponse.json<ErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const gmail = getGmailClient(session.accessToken, session.refreshToken);
    const isWorkspace = !!session.hostedDomain;

    // Get both Gmail API count (for comparison) and our database count (accurate for BCC)
    const [gmailQuota, dbSentCount] = await Promise.all([
      getQuotaInfo(gmail, isWorkspace),
      getTodaySentCount(session.user.email)
    ]);

    // Use the higher of the two counts to be conservative
    // Gmail API undercounts BCC emails, DB accurately counts each recipient
    const sentToday = Math.max(gmailQuota.sentToday, dbSentCount);
    const limit = isWorkspace ? 1500 : 400;
    const remaining = Math.max(0, limit - sentToday);

    return NextResponse.json<QuotaInfo>({
      sentToday,
      limit,
      remaining,
      resetTime: gmailQuota.resetTime
    });
  } catch (error) {
    console.error('Error fetching quota:', error);

    if (isAuthError(error)) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Session expired. Please sign in again.' },
        { status: 401 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json<ErrorResponse>(
      { error: 'Failed to fetch quota', details: errorMessage },
      { status: 500 }
    );
  }
}
