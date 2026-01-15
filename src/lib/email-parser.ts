import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedEmailResult } from '@/types/campaign';

// RFC 5322 compliant email regex (simplified but robust)
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, error: 'Empty email' };
  }

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email too long (max 254 characters)' };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

function extractEmailsFromData(data: Record<string, unknown>[]): string[] {
  const emails: string[] = [];

  for (const row of data) {
    // Look for email in common column names
    const emailColumnNames = ['email', 'e-mail', 'email address', 'emailaddress', 'mail'];
    let foundEmail: string | null = null;

    // Check each possible column name (case-insensitive)
    for (const [key, value] of Object.entries(row)) {
      const lowerKey = key.toLowerCase().trim();
      if (emailColumnNames.includes(lowerKey) && typeof value === 'string' && value.trim()) {
        foundEmail = value.trim();
        break;
      }
    }

    // If no email column found, check if first column contains an email
    if (!foundEmail) {
      const firstValue = Object.values(row)[0];
      if (typeof firstValue === 'string' && firstValue.includes('@')) {
        foundEmail = firstValue.trim();
      }
    }

    if (foundEmail) {
      emails.push(foundEmail);
    }
  }

  return emails;
}

export function parseCSV(content: string): string[] {
  const result = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    // Try parsing without headers (single column of emails)
    const noHeaderResult = Papa.parse<string[]>(content, {
      header: false,
      skipEmptyLines: true,
    });

    return noHeaderResult.data
      .flat()
      .map((cell) => (typeof cell === 'string' ? cell.trim() : ''))
      .filter((cell) => cell.includes('@'));
  }

  return extractEmailsFromData(result.data);
}

export function parseExcel(buffer: ArrayBuffer): string[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Try parsing with headers first
  const dataWithHeaders = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
  let emails = extractEmailsFromData(dataWithHeaders);

  // If no emails found, try without headers (single column)
  if (emails.length === 0) {
    const dataWithoutHeaders = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
    emails = dataWithoutHeaders
      .flat()
      .map((cell) => (typeof cell === 'string' ? cell.trim() : ''))
      .filter((cell) => cell.includes('@'));
  }

  return emails;
}

export function parseAndValidateEmails(rawEmails: string[]): ParsedEmailResult {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: { email: string; reason: string }[] = [];
  const duplicates: string[] = [];

  for (const rawEmail of rawEmails) {
    const email = rawEmail.trim().toLowerCase();

    if (!email) continue;

    // Check for duplicates
    if (seen.has(email)) {
      duplicates.push(email);
      continue;
    }
    seen.add(email);

    // Validate email format
    const validation = validateEmail(email);
    if (validation.valid) {
      valid.push(email);
    } else {
      invalid.push({ email, reason: validation.error || 'Invalid email' });
    }
  }

  return { valid, invalid, duplicates };
}

export async function parseEmailFile(file: File): Promise<ParsedEmailResult> {
  const fileName = file.name.toLowerCase();

  let rawEmails: string[] = [];

  if (fileName.endsWith('.csv')) {
    const content = await file.text();
    rawEmails = parseCSV(content);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    rawEmails = parseExcel(buffer);
  } else {
    // Treat as plain text (one email per line)
    const content = await file.text();
    rawEmails = content
      .split(/[\n\r,;]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  return parseAndValidateEmails(rawEmails);
}

// Server-side parsing functions (for API routes)
export function parseCSVBuffer(buffer: Buffer): string[] {
  const content = buffer.toString('utf-8');
  return parseCSV(content);
}

export function parseExcelBuffer(buffer: Buffer): string[] {
  const uint8Array = new Uint8Array(buffer);
  const arrayBuffer = uint8Array.buffer.slice(
    uint8Array.byteOffset,
    uint8Array.byteOffset + uint8Array.byteLength
  ) as ArrayBuffer;
  return parseExcel(arrayBuffer);
}
