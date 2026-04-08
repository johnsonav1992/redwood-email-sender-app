import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getGmailClient, sendEmail, isAuthError } from '@/lib/gmail';
import { logError, logInfo, logWarn } from '@/lib/logger';
import type { ErrorResponse } from '@/types/email';

interface SendTestRequest {
  subject: string;
  htmlBody: string;
}

interface SendTestResponse {
  success: boolean;
  recipient: string;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<SendTestResponse | ErrorResponse>> {
  const session = await getServerSession(authOptions);

  if (
    !session?.accessToken ||
    !session?.refreshToken ||
    !session?.user?.email
  ) {
    logWarn('send_test.unauthorized');
    return NextResponse.json<ErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = (await req.json()) as SendTestRequest;
  const { subject, htmlBody } = body;

  if (!subject || !htmlBody) {
    logWarn('send_test.validation_failed', {
      userEmail: session.user.email,
      hasSubject: !!subject,
      hasHtmlBody: !!htmlBody
    });
    return NextResponse.json<ErrorResponse>(
      { error: 'Subject and body are required' },
      { status: 400 }
    );
  }

  try {
    const startedAt = Date.now();
    logInfo('send_test.start', {
      userEmail: session.user.email,
      subjectLength: subject.length,
      bodyLength: htmlBody.length
    });
    const gmail = getGmailClient(session.accessToken, session.refreshToken);
    await sendEmail(gmail, session.user.email, `[TEST] ${subject}`, htmlBody);

    logInfo('send_test.success', {
      userEmail: session.user.email,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json<SendTestResponse>({
      success: true,
      recipient: session.user.email
    });
  } catch (error) {
    logError(
      'send_test.failed',
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
      { error: 'Failed to send test email', details: errorMessage },
      { status: 500 }
    );
  }
}
