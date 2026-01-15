import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getGmailClient, getQuotaInfo, type QuotaInfo } from '@/lib/gmail';

interface ErrorResponse {
  error: string;
  details?: string;
}

export async function GET(): Promise<NextResponse<QuotaInfo | ErrorResponse>> {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session?.refreshToken) {
    return NextResponse.json<ErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const gmail = getGmailClient(session.accessToken, session.refreshToken);
    const quotaInfo = await getQuotaInfo(gmail, !!session.hostedDomain);

    return NextResponse.json<QuotaInfo>(quotaInfo);
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
