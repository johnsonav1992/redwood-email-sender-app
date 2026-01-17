import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getGmailClient, sendEmail } from '@/lib/gmail';
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

  if (!session?.accessToken || !session?.refreshToken || !session?.user?.email) {
    return NextResponse.json<ErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = (await req.json()) as SendTestRequest;
  const { subject, htmlBody } = body;

  if (!subject || !htmlBody) {
    return NextResponse.json<ErrorResponse>(
      { error: 'Subject and body are required' },
      { status: 400 }
    );
  }

  try {
    const gmail = getGmailClient(session.accessToken, session.refreshToken);
    await sendEmail(gmail, session.user.email, `[TEST] ${subject}`, htmlBody);

    return NextResponse.json<SendTestResponse>({
      success: true,
      recipient: session.user.email,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ErrorResponse>(
      { error: 'Failed to send test email', details: errorMessage },
      { status: 500 }
    );
  }
}
