import Papa from 'papaparse';
import ExcelJS from 'exceljs';
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

export async function parseExcel(buffer: ArrayBuffer): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: Record<string, unknown>[] = [];
  const allCells: string[] = [];
  let headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values as (string | number | null | undefined)[];
    // row.values is 1-indexed, so values[0] is undefined
    const cells = values.slice(1);

    if (rowNumber === 1) {
      // First row as headers
      headers = cells.map((cell) => String(cell ?? '').trim().toLowerCase());
    } else {
      // Build row object with headers
      const rowData: Record<string, unknown> = {};
      cells.forEach((cell, index) => {
        const header = headers[index] || `col${index}`;
        rowData[header] = cell;
      });
      rows.push(rowData);
    }

    // Also collect all cells for fallback
    cells.forEach((cell) => {
      if (cell != null) {
        allCells.push(String(cell).trim());
      }
    });
  });

  // Try parsing with headers first
  let emails = extractEmailsFromData(rows);

  // If no emails found, try all cells (single column fallback)
  if (emails.length === 0) {
    emails = allCells.filter((cell) => cell.includes('@'));
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

// Server-side parsing functions (for API routes)
export function parseCSVBuffer(buffer: Buffer): string[] {
  const content = buffer.toString('utf-8');
  return parseCSV(content);
}

export async function parseExcelBuffer(buffer: Buffer): Promise<string[]> {
  const uint8Array = new Uint8Array(buffer);
  const arrayBuffer = uint8Array.buffer.slice(
    uint8Array.byteOffset,
    uint8Array.byteOffset + uint8Array.byteLength
  ) as ArrayBuffer;
  return await parseExcel(arrayBuffer);
}
