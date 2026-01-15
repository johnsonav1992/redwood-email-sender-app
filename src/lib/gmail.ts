import { google, gmail_v1 } from 'googleapis';
import { buildMimeMessage, extractImagesFromHtml, type InlineImage } from './mime-builder';

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
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

  const messageParts = [
    'MIME-Version: 1.0',
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
  bccRecipients: string[],
  subject: string,
  htmlBody: string,
  signature?: string,
  additionalImages?: InlineImage[]
) {
  const fullHtml = signature ? `${htmlBody}${signature}` : htmlBody;

  const { html: processedHtml, images: extractedImages } = extractImagesFromHtml(fullHtml);

  const allImages = [...extractedImages, ...(additionalImages || [])];

  const encodedMessage = buildMimeMessage({
    from: senderEmail,
    to: senderEmail,
    bcc: bccRecipients,
    subject,
    htmlBody: processedHtml,
    inlineImages: allImages.length > 0 ? allImages : undefined,
  });

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return res.data;
}

export async function getUserEmail(gmail: gmail_v1.Gmail): Promise<string> {
  const res = await gmail.users.getProfile({ userId: 'me' });
  return res.data.emailAddress || '';
}
