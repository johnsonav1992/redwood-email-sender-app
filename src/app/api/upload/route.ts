import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  parseCSVBuffer,
  parseExcelBuffer,
  parseAndValidateEmails
} from '@/lib/email-parser';
import type { ParsedEmailResult } from '@/types/campaign';

interface UploadResponse {
  success: true;
  result: ParsedEmailResult;
}

interface ErrorResponse {
  success: false;
  error: string;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<UploadResponse | ErrorResponse>> {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let rawEmails: string[] = [];

    if (fileName.endsWith('.csv')) {
      rawEmails = parseCSVBuffer(buffer);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      rawEmails = await parseExcelBuffer(buffer);
    } else if (fileName.endsWith('.txt')) {
      const content = buffer.toString('utf-8');
      rawEmails = content
        .split(/[\n\r,;]+/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported file type. Use .csv, .xlsx, .xls, or .txt'
        },
        { status: 400 }
      );
    }

    const result = parseAndValidateEmails(rawEmails);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse file' },
      { status: 500 }
    );
  }
}
