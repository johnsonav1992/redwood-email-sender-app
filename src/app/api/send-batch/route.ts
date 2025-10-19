import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getGmailClient, sendEmail } from '@/lib/gmail';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session?.refreshToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { recipients, subject, htmlBody, batchSize = 30 } = body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: 'Recipients array is required' }, { status: 400 });
  }

  try {
    const gmail = getGmailClient(session.accessToken, session.refreshToken);
    const batch = recipients.slice(0, batchSize);
    const results = [];

    for (const recipient of batch) {
      try {
        await sendEmail(gmail, recipient, subject, htmlBody);
        results.push({
          email: recipient,
          status: 'sent',
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        results.push({
          email: recipient,
          status: 'failed',
          error: error.message
        });
      }

      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      batchSize: batch.length,
      sent,
      failed,
      remaining: recipients.length - batch.length,
      results
    });
  } catch (error: any) {
    console.error('Error sending batch:', error);
    return NextResponse.json(
      { error: 'Failed to send batch', details: error.message },
      { status: 500 }
    );
  }
}
