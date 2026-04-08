import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  parseCSVBuffer,
  parseExcelBuffer,
  parseAndValidateEmails
} from '@/lib/email-parser';
import { logError, logInfo, logWarn } from '@/lib/logger';
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
    logWarn('upload.unauthorized');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const startedAt = Date.now();
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      logWarn('upload.missing_file', {
        userEmail: session.user?.email
      });
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    logInfo('upload.parse_start', {
      userEmail: session.user?.email,
      fileName,
      fileSizeBytes: buffer.length
    });

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
      logWarn('upload.unsupported_file_type', {
        userEmail: session.user?.email,
        fileName
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported file type. Use .csv, .xlsx, .xls, or .txt'
        },
        { status: 400 }
      );
    }

    const result = parseAndValidateEmails(rawEmails);

    logInfo('upload.parse_success', {
      userEmail: session.user?.email,
      fileName,
      rawCount: rawEmails.length,
      validCount: result.valid.length,
      invalidCount: result.invalid.length,
      duplicateCount: result.duplicates.length,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    logError('upload.parse_failed', { userEmail: session.user?.email }, error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse file' },
      { status: 500 }
    );
  }
}
