import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getGmailClient, sendEmail } from '@/lib/gmail';
import { logError, logInfo, logWarn } from '@/lib/logger';
import {
  BatchSendRequest,
  BatchSendResponse,
  EmailResult,
  ErrorResponse
} from '@/types/email';

export async function POST(
  req: NextRequest
): Promise<NextResponse<BatchSendResponse | ErrorResponse>> {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session?.refreshToken) {
    logWarn('send_batch.unauthorized');
    return NextResponse.json<ErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = (await req.json()) as BatchSendRequest;
  const { recipients, subject, htmlBody, batchSize = 1 } = body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    logWarn('send_batch.validation_failed', {
      userEmail: session.user?.email,
      hasRecipients: !!recipients,
      recipientCount: Array.isArray(recipients) ? recipients.length : null
    });
    return NextResponse.json<ErrorResponse>(
      { error: 'Recipients array is required' },
      { status: 400 }
    );
  }

  try {
    const startedAt = Date.now();
    const gmail = getGmailClient(session.accessToken, session.refreshToken);
    const batch = recipients.slice(0, batchSize);
    const results: EmailResult[] = [];
    logInfo('send_batch.start', {
      userEmail: session.user?.email,
      requestedRecipientCount: recipients.length,
      batchSize,
      actualBatchCount: batch.length,
      subjectLength: subject?.length,
      bodyLength: htmlBody?.length
    });

    for (const recipient of batch) {
      try {
        await sendEmail(gmail, recipient, subject, htmlBody);
        results.push({
          email: recipient,
          status: 'sent',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logError(
          'send_batch.recipient_failed',
          { userEmail: session.user?.email },
          error
        );
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        results.push({
          email: recipient,
          status: 'failed',
          error: errorMessage
        });
      }

      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    logInfo('send_batch.success', {
      userEmail: session.user?.email,
      sent,
      failed,
      remaining: recipients.length - batch.length,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json<BatchSendResponse>({
      batchSize: batch.length,
      sent,
      failed,
      remaining: recipients.length - batch.length,
      results
    });
  } catch (error) {
    logError('send_batch.failed', { userEmail: session.user?.email }, error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ErrorResponse>(
      { error: 'Failed to send batch', details: errorMessage },
      { status: 500 }
    );
  }
}
