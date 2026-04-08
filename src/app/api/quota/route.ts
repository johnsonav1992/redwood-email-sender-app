import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getGmailClient,
  getQuotaInfo,
  isAuthError,
  type QuotaInfo
} from '@/lib/gmail';
import { getTodaySentCount, getOldestSentEmailTime } from '@/lib/db';
import { logError, logInfo, logWarn } from '@/lib/logger';

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
    logWarn('quota.api_unauthorized');
    return NextResponse.json<ErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const startedAt = Date.now();
    const gmail = getGmailClient(session.accessToken, session.refreshToken);
    const isWorkspace = !!session.hostedDomain;

    const [gmailQuota, dbSentCount, oldestSentAt] = await Promise.all([
      getQuotaInfo(gmail, isWorkspace),
      getTodaySentCount(session.user.email),
      getOldestSentEmailTime(session.user.email)
    ]);

    const sentToday = Math.max(gmailQuota.sentToday, dbSentCount);
    const limit = isWorkspace ? 2000 : 500;
    const remaining = Math.max(0, limit - sentToday);

    // Rolling reset: oldest tracked email expires 24h after it was sent
    const resetTime = oldestSentAt
      ? new Date(
          new Date(oldestSentAt).getTime() + 24 * 60 * 60 * 1000
        ).toISOString()
      : gmailQuota.resetTime;

    logInfo('quota.api_success', {
      userEmail: session.user.email,
      isWorkspace,
      gmailSentToday: gmailQuota.sentToday,
      dbSentCount,
      oldestSentAt,
      sentToday,
      limit,
      remaining,
      resetTime,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json<QuotaInfo>({
      sentToday,
      limit,
      remaining,
      resetTime
    });
  } catch (error) {
    logError(
      'quota.api_failed',
      { userEmail: session.user.email },
      error
    );

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
