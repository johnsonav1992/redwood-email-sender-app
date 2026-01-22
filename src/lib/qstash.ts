import { Client } from '@upstash/qstash';

function getQStashClient(): Client | null {
  if (!process.env.QSTASH_TOKEN) {
    console.warn('[QStash] QSTASH_TOKEN not configured');
    return null;
  }
  return new Client({ token: process.env.QSTASH_TOKEN });
}

export async function scheduleNextBatch(
  campaignId: string,
  delaySeconds: number
): Promise<string | null> {
  const qstash = getQStashClient();
  if (!qstash) {
    return null;
  }

  const baseUrl = process.env.SITE_URL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    console.error('[QStash] SITE_URL or NEXTAUTH_URL not configured');
    return null;
  }

  const targetUrl = `${baseUrl}/api/campaigns/${campaignId}/process`;
  console.log(`[QStash] Scheduling batch for campaign ${campaignId}`);
  console.log(`[QStash] Target URL: ${targetUrl}`);
  console.log(`[QStash] Delay: ${delaySeconds}s`);

  try {
    const result = await qstash.publishJSON({
      url: targetUrl,
      delay: delaySeconds,
      body: { campaignId }
    });

    console.log(`[QStash] Message scheduled successfully: ${result.messageId}`);
    return result.messageId;
  } catch (error) {
    console.error('[QStash] Failed to schedule message:', error);
    throw error;
  }
}

export async function triggerImmediateBatch(
  campaignId: string
): Promise<string | null> {
  console.log(`[QStash] Triggering immediate batch for campaign ${campaignId}`);
  return scheduleNextBatch(campaignId, 0);
}
