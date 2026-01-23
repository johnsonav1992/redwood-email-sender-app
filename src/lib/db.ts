import { createClient } from '@libsql/client';
import { SCHEMA_SQL } from './schema';
import type {
  Campaign,
  Recipient,
  CampaignImage,
  CampaignStatus,
  CreateCampaignInput,
  CampaignWithProgress
} from '@/types/campaign';

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error('TURSO_DATABASE_URL is not defined in environment variables');
}

if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error('TURSO_AUTH_TOKEN is not defined in environment variables');
}

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function toPlainObject<T extends object>(row: T): T {
  return { ...row };
}

function toPlainObjects<T extends object>(rows: T[]): T[] {
  return rows.map(row => ({ ...row }));
}

export async function initializeSchema(): Promise<void> {
  const statements = SCHEMA_SQL.split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement);
  }

  // Migration: Add last_batch_at column if it doesn't exist
  try {
    await db.execute(`ALTER TABLE campaigns ADD COLUMN last_batch_at TEXT`);
  } catch {
    // Column already exists
  }

  // Migration: Add next_batch_at column if it doesn't exist
  try {
    await db.execute(`ALTER TABLE campaigns ADD COLUMN next_batch_at TEXT`);
  } catch {
    // Column already exists
  }

  // Migration: Add to_email column if it doesn't exist
  try {
    await db.execute(`ALTER TABLE campaigns ADD COLUMN to_email TEXT`);
  } catch {
    // Column already exists
  }
}

// Campaign operations
export async function createCampaign(
  input: CreateCampaignInput
): Promise<Campaign> {
  const id = generateId();
  const timestamp = now();

  await db.execute({
    sql: `INSERT INTO campaigns (id, user_email, name, subject, body, signature, to_email, batch_size, batch_delay_seconds, status, total_recipients, sent_count, failed_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, 0, 0, ?, ?)`,
    args: [
      id,
      input.user_email,
      input.name || null,
      input.subject,
      input.body,
      input.signature || null,
      input.to_email || null,
      input.batch_size || 30,
      input.batch_delay_seconds || 60,
      input.recipients.length,
      timestamp,
      timestamp
    ]
  });

  // Insert recipients
  for (const email of input.recipients) {
    await db.execute({
      sql: `INSERT INTO recipients (id, campaign_id, email, status) VALUES (?, ?, ?, 'pending')`,
      args: [generateId(), id, email.toLowerCase().trim()]
    });
  }

  return getCampaignById(id) as Promise<Campaign>;
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const result = await db.execute({
    sql: `SELECT * FROM campaigns WHERE id = ?`,
    args: [id]
  });

  if (result.rows.length === 0) return null;
  return toPlainObject(result.rows[0] as unknown as Campaign);
}

export async function getCampaignsByUser(
  userEmail: string
): Promise<CampaignWithProgress[]> {
  const result = await db.execute({
    sql: `SELECT c.*,
          (SELECT COUNT(*) FROM recipients r WHERE r.campaign_id = c.id AND r.status = 'pending') as pending_count
          FROM campaigns c
          WHERE c.user_email = ?
          ORDER BY c.created_at DESC`,
    args: [userEmail]
  });

  return toPlainObjects(result.rows as unknown as CampaignWithProgress[]);
}

export async function updateCampaignStatus(
  id: string,
  status: CampaignStatus
): Promise<void> {
  await db.execute({
    sql: `UPDATE campaigns SET status = ?, updated_at = ? WHERE id = ?`,
    args: [status, now(), id]
  });
}

export async function updateLastBatchAt(id: string): Promise<void> {
  await db.execute({
    sql: `UPDATE campaigns SET last_batch_at = ?, updated_at = ? WHERE id = ?`,
    args: [now(), now(), id]
  });
}

export async function updateNextBatchAt(
  id: string,
  nextBatchAt: string | null
): Promise<void> {
  await db.execute({
    sql: `UPDATE campaigns SET next_batch_at = ?, updated_at = ? WHERE id = ?`,
    args: [nextBatchAt, now(), id]
  });
}

export async function updateCampaignDraft(
  id: string,
  data: {
    name?: string;
    subject?: string;
    body?: string;
    signature?: string | null;
    to_email?: string | null;
    batch_size?: number;
    batch_delay_seconds?: number;
    recipients?: string[];
  }
): Promise<void> {
  const fields: Record<string, string | number | null> = {};

  if (data.name !== undefined) fields.name = data.name || null;
  if (data.subject !== undefined) fields.subject = data.subject;
  if (data.body !== undefined) fields.body = data.body;
  if (data.signature !== undefined) fields.signature = data.signature || null;
  if (data.to_email !== undefined) fields.to_email = data.to_email || null;
  if (data.batch_size !== undefined) fields.batch_size = data.batch_size;
  if (data.batch_delay_seconds !== undefined)
    fields.batch_delay_seconds = data.batch_delay_seconds;
  if (data.recipients !== undefined)
    fields.total_recipients = data.recipients.length;

  const entries = Object.entries(fields);
  if (entries.length > 0) {
    const setClauses = [
      ...entries.map(([key]) => `${key} = ?`),
      'updated_at = ?'
    ];
    const args = [...entries.map(([, value]) => value), now(), id];

    await db.execute({
      sql: `UPDATE campaigns SET ${setClauses.join(', ')} WHERE id = ?`,
      args
    });
  }

  if (data.recipients !== undefined) {
    await db.execute({
      sql: `DELETE FROM recipients WHERE campaign_id = ?`,
      args: [id]
    });

    for (const email of data.recipients) {
      await db.execute({
        sql: `INSERT INTO recipients (id, campaign_id, email, status) VALUES (?, ?, ?, 'pending')`,
        args: [generateId(), id, email.toLowerCase().trim()]
      });
    }
  }
}

export async function updateCampaignCounts(
  id: string,
  sentCount: number,
  failedCount: number
): Promise<void> {
  await db.execute({
    sql: `UPDATE campaigns SET sent_count = ?, failed_count = ?, updated_at = ? WHERE id = ?`,
    args: [sentCount, failedCount, now(), id]
  });
}

export async function deleteCampaign(id: string): Promise<void> {
  await db.execute({
    sql: `DELETE FROM campaigns WHERE id = ?`,
    args: [id]
  });
}

export async function duplicateCampaign(
  sourceId: string,
  userEmail: string
): Promise<Campaign | null> {
  const source = await getCampaignById(sourceId);
  if (!source || source.user_email !== userEmail) {
    return null;
  }

  const id = generateId();
  const timestamp = now();
  const newName = source.name ? `${source.name} (Copy)` : null;

  await db.execute({
    sql: `INSERT INTO campaigns (id, user_email, name, subject, body, signature, to_email, batch_size, batch_delay_seconds, status, total_recipients, sent_count, failed_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, 0, 0, ?, ?)`,
    args: [
      id,
      userEmail,
      newName,
      source.subject,
      source.body,
      source.signature,
      source.to_email,
      source.batch_size,
      source.batch_delay_seconds,
      timestamp,
      timestamp
    ]
  });

  return getCampaignById(id);
}

// Recipient operations
export async function getRecipientsByCampaign(
  campaignId: string,
  options?: {
    status?: 'all' | 'sent' | 'pending' | 'failed';
    limit?: number;
    offset?: number;
  }
): Promise<{ recipients: Recipient[]; total: number }> {
  const { status = 'all', limit = 50, offset = 0 } = options || {};

  let whereClause = 'campaign_id = ?';
  const args: (string | number)[] = [campaignId];

  if (status === 'sent') {
    whereClause += " AND status = 'sent'";
  } else if (status === 'pending') {
    whereClause += " AND status IN ('pending', 'sending')";
  } else if (status === 'failed') {
    whereClause += " AND status = 'failed'";
  }

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM recipients WHERE ${whereClause}`,
    args
  });
  const total = Number((countResult.rows[0] as Record<string, number>).count);

  const result = await db.execute({
    sql: `SELECT * FROM recipients WHERE ${whereClause} ORDER BY
      CASE status
        WHEN 'sent' THEN 1
        WHEN 'failed' THEN 2
        WHEN 'sending' THEN 3
        WHEN 'pending' THEN 4
      END,
      sent_at DESC NULLS LAST,
      id
      LIMIT ? OFFSET ?`,
    args: [...args, limit, offset]
  });

  return {
    recipients: result.rows as unknown as Recipient[],
    total
  };
}

export async function getPendingRecipients(
  campaignId: string,
  limit: number
): Promise<Recipient[]> {
  const result = await db.execute({
    sql: `SELECT * FROM recipients WHERE campaign_id = ? AND status = 'pending' ORDER BY id LIMIT ?`,
    args: [campaignId, limit]
  });

  return result.rows as unknown as Recipient[];
}

// Atomically claim pending recipients by marking them as 'sending'
// This prevents race conditions when multiple processes try to send the same batch
export async function claimPendingRecipients(
  campaignId: string,
  limit: number
): Promise<Recipient[]> {
  // Check if there are already recipients being sent - don't start a new batch
  const sendingCheck = await db.execute({
    sql: `SELECT COUNT(*) as count FROM recipients WHERE campaign_id = ? AND status = 'sending'`,
    args: [campaignId]
  });
  const sendingCount =
    Number((sendingCheck.rows[0] as Record<string, number>).count) || 0;
  if (sendingCount > 0) {
    // Another batch is already in progress
    return [];
  }

  // Get the IDs of recipients we want to claim
  const pendingResult = await db.execute({
    sql: `SELECT id FROM recipients WHERE campaign_id = ? AND status = 'pending' ORDER BY id LIMIT ?`,
    args: [campaignId, limit]
  });

  if (pendingResult.rows.length === 0) {
    return [];
  }

  const ids = pendingResult.rows.map(r => (r as unknown as { id: string }).id);

  // Mark them as 'sending' atomically
  // Only update rows that are still 'pending' (in case another process got them first)
  const placeholders = ids.map(() => '?').join(',');
  const updateResult = await db.execute({
    sql: `UPDATE recipients SET status = 'sending' WHERE id IN (${placeholders}) AND status = 'pending'`,
    args: ids
  });

  // If no rows were updated, another process claimed them
  if (updateResult.rowsAffected === 0) {
    return [];
  }

  // Return the recipients that were successfully claimed
  const claimedResult = await db.execute({
    sql: `SELECT * FROM recipients WHERE id IN (${placeholders}) AND status = 'sending'`,
    args: ids
  });

  return claimedResult.rows as unknown as Recipient[];
}

export async function markRecipientsAsSent(
  recipientIds: string[],
  batchNumber: number
): Promise<void> {
  const timestamp = now();
  for (const id of recipientIds) {
    await db.execute({
      sql: `UPDATE recipients SET status = 'sent', batch_number = ?, sent_at = ? WHERE id = ?`,
      args: [batchNumber, timestamp, id]
    });
  }
}

export async function markRecipientsAsFailed(
  recipientIds: string[],
  errorMessage: string,
  batchNumber: number
): Promise<void> {
  for (const id of recipientIds) {
    await db.execute({
      sql: `UPDATE recipients SET status = 'failed', error_message = ?, batch_number = ? WHERE id = ?`,
      args: [errorMessage, batchNumber, id]
    });
  }
}

export async function getCampaignProgress(campaignId: string): Promise<{
  total: number;
  sent: number;
  failed: number;
  pending: number;
  sending: number;
}> {
  const result = await db.execute({
    sql: `SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'sending' THEN 1 ELSE 0 END) as sending
          FROM recipients WHERE campaign_id = ?`,
    args: [campaignId]
  });

  const row = result.rows[0] as Record<string, number>;
  return {
    total: Number(row.total) || 0,
    sent: Number(row.sent) || 0,
    failed: Number(row.failed) || 0,
    pending: Number(row.pending) || 0,
    sending: Number(row.sending) || 0
  };
}

// Campaign image operations
export async function addCampaignImage(
  campaignId: string,
  contentId: string,
  filename: string,
  mimeType: string,
  base64Data: string
): Promise<CampaignImage> {
  const id = generateId();

  await db.execute({
    sql: `INSERT INTO campaign_images (id, campaign_id, content_id, filename, mime_type, base64_data)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, campaignId, contentId, filename, mimeType, base64Data]
  });

  return {
    id,
    campaign_id: campaignId,
    content_id: contentId,
    filename,
    mime_type: mimeType,
    base64_data: base64Data
  };
}

export async function getCampaignImages(
  campaignId: string
): Promise<CampaignImage[]> {
  const result = await db.execute({
    sql: `SELECT * FROM campaign_images WHERE campaign_id = ?`,
    args: [campaignId]
  });

  return result.rows as unknown as CampaignImage[];
}

// User token operations (for server-side campaign processing)
export async function saveUserTokens(
  userEmail: string,
  accessToken: string,
  refreshToken: string,
  hostedDomain?: string
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO user_tokens (user_email, access_token, refresh_token, hosted_domain, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_email) DO UPDATE SET
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            hosted_domain = excluded.hosted_domain,
            updated_at = excluded.updated_at`,
    args: [userEmail, accessToken, refreshToken, hostedDomain || null, now()]
  });
}

export async function getUserTokens(userEmail: string): Promise<{
  accessToken: string;
  refreshToken: string;
  hostedDomain?: string;
} | null> {
  const result = await db.execute({
    sql: `SELECT access_token, refresh_token, hosted_domain FROM user_tokens WHERE user_email = ?`,
    args: [userEmail]
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0] as Record<string, string>;
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    hostedDomain: row.hosted_domain || undefined
  };
}

// Record a sent email for quota tracking (persists even if campaign is deleted)
export async function recordSentEmail(
  userEmail: string,
  recipientEmail: string,
  campaignId: string
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO sent_emails (id, user_email, recipient_email, campaign_id, sent_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [generateId(), userEmail, recipientEmail, campaignId, now()]
  });
}

// Get count of emails sent today by a user (independent of campaign deletions)
// This is more accurate than Gmail API for BCC emails since each recipient = 1 quota
export async function getTodaySentCount(userEmail: string): Promise<number> {
  // Get start of today in UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  const result = await db.execute({
    sql: `SELECT COUNT(*) as count
          FROM sent_emails
          WHERE user_email = ?
            AND sent_at >= ?`,
    args: [userEmail, todayStart]
  });

  const row = result.rows[0] as Record<string, number>;
  return Number(row.count) || 0;
}
