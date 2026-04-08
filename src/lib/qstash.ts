import { Client } from '@upstash/qstash';
import { logError, logInfo, logWarn } from '@/lib/logger';

function getQStashClient(): Client | null {
  if (!process.env.QSTASH_TOKEN) {
    logWarn('qstash.client_missing_token');
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
    logWarn('qstash.schedule_skipped_no_client', { campaignId, delaySeconds });
    return null;
  }

  const baseUrl = process.env.SITE_URL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    logError('qstash.schedule_missing_base_url', {
      campaignId,
      delaySeconds
    });
    return null;
  }

  const targetUrl = `${baseUrl}/api/campaigns/${campaignId}/process`;
  logInfo('qstash.schedule_attempt', {
    campaignId,
    delaySeconds,
    targetUrl
  });

  try {
    const result = await qstash.publishJSON({
      url: targetUrl,
      delay: delaySeconds,
      body: { campaignId }
    });

    logInfo('qstash.schedule_success', {
      campaignId,
      delaySeconds,
      messageId: result.messageId
    });
    return result.messageId;
  } catch (error) {
    logError(
      'qstash.schedule_failed',
      {
        campaignId,
        delaySeconds,
        targetUrl
      },
      error
    );
    throw error;
  }
}

export async function triggerImmediateBatch(
  campaignId: string
): Promise<string | null> {
  logInfo('qstash.trigger_immediate', { campaignId });
  return scheduleNextBatch(campaignId, 0);
}
