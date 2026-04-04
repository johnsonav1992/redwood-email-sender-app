import { google, gmail_v1 } from 'googleapis';
import {
  buildMimeMessage,
  extractImagesFromHtml,
  type InlineImage
} from './mime-builder';

export const AUTH_ERROR_CODE = 'AUTH_REFRESH_REQUIRED';

export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('invalid_grant') ||
      message.includes('token has been expired or revoked') ||
      message.includes('invalid credentials')
    );
  }
  return false;
}

export function getGmailClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function sendEmail(
  gmail: gmail_v1.Gmail,
  to: string,
  subject: string,
  htmlBody: string
) {
  const profile = await gmail.users.getProfile({ userId: 'me' });
  const from = profile.data.emailAddress || '';
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

  const messageParts = [
    'MIME-Version: 1.0',
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlBody).toString('base64')
  ];

  const message = messageParts.join('\n');
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });

  return res.data;
}

export async function sendBccEmail(
  gmail: gmail_v1.Gmail,
  senderEmail: string,
  toEmail: string,
  bccRecipients: string[],
  subject: string,
  htmlBody: string,
  signature?: string,
  additionalImages?: InlineImage[]
) {
  const fullHtml = signature ? `${htmlBody}${signature}` : htmlBody;

  const { html: processedHtml, images: extractedImages } =
    extractImagesFromHtml(fullHtml);

  const allImages = [...extractedImages, ...(additionalImages || [])];

  const encodedMessage = buildMimeMessage({
    from: senderEmail,
    to: toEmail,
    bcc: bccRecipients,
    subject,
    htmlBody: processedHtml,
    inlineImages: allImages.length > 0 ? allImages : undefined
  });

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });

  return res.data;
}

export async function getUserEmail(gmail: gmail_v1.Gmail): Promise<string> {
  const res = await gmail.users.getProfile({ userId: 'me' });
  return res.data.emailAddress || '';
}

export interface QuotaInfo {
  sentToday: number;
  limit: number;
  remaining: number;
  resetTime: string;
}

export async function getQuotaInfo(
  gmail: gmail_v1.Gmail,
  isWorkspace: boolean
): Promise<QuotaInfo> {
  let sentCount = 0;
  let pageToken: string | undefined;
  let pagesFetched = 0;

  do {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:sent newer_than:1d',
      maxResults: 500,
      ...(pageToken && { pageToken })
    });

    const pageCount = response.data.messages?.length ?? 0;
    sentCount += pageCount;
    pageToken = response.data.nextPageToken ?? undefined;
    pagesFetched++;

    console.log(
      `[quota/gmail] page ${pagesFetched}: ${pageCount} messages (running total: ${sentCount})`
    );
  } while (pageToken);

  const limit = isWorkspace ? 2000 : 500;

  console.log(
    `[quota/gmail] done — ${sentCount} sent in last 24h, limit: ${limit} (${isWorkspace ? 'Workspace' : 'free'})`
  );

  return {
    sentToday: sentCount,
    limit,
    remaining: Math.max(0, limit - sentCount),
    resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}
