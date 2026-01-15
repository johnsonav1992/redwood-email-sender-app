export interface InlineImage {
  contentId: string;
  filename: string;
  mimeType: string;
  base64Data: string;
}

export interface EmailMessage {
  from: string;
  to: string;
  bcc: string[];
  subject: string;
  htmlBody: string;
  inlineImages?: InlineImage[];
}

function generateBoundary(): string {
  return `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

function encodeSubject(subject: string): string {
  return `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
}

function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.substring(i, i + size));
  }
  return chunks;
}

export function buildMimeMessage(message: EmailMessage): string {
  const hasImages = message.inlineImages && message.inlineImages.length > 0;
  const boundary = generateBoundary();

  const headers: string[] = [
    'MIME-Version: 1.0',
    `From: ${message.from}`,
    `To: ${message.to}`,
  ];

  if (message.bcc.length > 0) {
    headers.push(`Bcc: ${message.bcc.join(', ')}`);
  }

  headers.push(`Subject: ${encodeSubject(message.subject)}`);

  if (hasImages) {
    headers.push(`Content-Type: multipart/related; boundary="${boundary}"`);
  } else {
    headers.push('Content-Type: text/html; charset=utf-8');
    headers.push('Content-Transfer-Encoding: base64');
  }

  const parts: string[] = [];

  if (hasImages) {
    parts.push(`--${boundary}`);
    parts.push('Content-Type: text/html; charset=utf-8');
    parts.push('Content-Transfer-Encoding: base64');
    parts.push('');
    parts.push(...chunkString(Buffer.from(message.htmlBody).toString('base64'), 76));

    for (const img of message.inlineImages!) {
      parts.push(`--${boundary}`);
      parts.push(`Content-Type: ${img.mimeType}; name="${img.filename}"`);
      parts.push('Content-Transfer-Encoding: base64');
      parts.push(`Content-ID: <${img.contentId}>`);
      parts.push(`Content-Disposition: inline; filename="${img.filename}"`);
      parts.push('');
      parts.push(...chunkString(img.base64Data, 76));
    }

    parts.push(`--${boundary}--`);
  } else {
    parts.push(...chunkString(Buffer.from(message.htmlBody).toString('base64'), 76));
  }

  const rawMessage = [...headers, '', ...parts].join('\r\n');

  return Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function extractImagesFromHtml(html: string): {
  html: string;
  images: InlineImage[];
} {
  const images: InlineImage[] = [];
  let imageCounter = 0;

  const processedHtml = html.replace(
    /<img\s+[^>]*src=["']data:([^;]+);base64,([^"']+)["'][^>]*>/gi,
    (match, mimeType, base64Data) => {
      const contentId = `img_${Date.now()}_${imageCounter++}`;
      const extension = mimeType.split('/')[1] || 'png';

      images.push({
        contentId,
        filename: `image_${imageCounter}.${extension}`,
        mimeType,
        base64Data,
      });

      return match.replace(/src=["']data:[^"']+["']/i, `src="cid:${contentId}"`);
    }
  );

  return { html: processedHtml, images };
}
