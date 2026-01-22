import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getCampaignById,
  getCampaignProgress,
  getPendingRecipients
} from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await context.params;
  const campaign = await getCampaignById(id);

  if (!campaign) {
    return new Response('Campaign not found', { status: 404 });
  }

  if (campaign.user_email !== session.user.email) {
    return new Response('Forbidden', { status: 403 });
  }

  const encoder = new TextEncoder();
  let lastStatus = '';
  let lastSent = -1;
  let lastFailed = -1;
  let lastPending = -1;
  let lastNextBatchAt = '';
  let isClosed = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const cleanup = () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      };

      const safeEnqueue = (data: Uint8Array) => {
        if (isClosed) return false;
        try {
          controller.enqueue(data);
          return true;
        } catch {
          isClosed = true;
          cleanup();
          return false;
        }
      };

      const safeClose = () => {
        if (isClosed) return;
        isClosed = true;
        cleanup();
        try {
          controller.close();
        } catch {
          // Controller already closed, ignore
        }
      };

      const sendUpdate = async (): Promise<boolean> => {
        if (isClosed) return false;

        try {
          const currentCampaign = await getCampaignById(id);
          const progress = await getCampaignProgress(id);

          if (isClosed) return false;

          if (!currentCampaign) {
            safeEnqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'deleted' })}\n\n`)
            );
            safeClose();
            return false;
          }

          // Include 'sending' recipients in pending count for UI display
          const effectivePending = progress.pending + progress.sending;

          const currentNextBatchAt = currentCampaign.next_batch_at || '';

          const hasChanged =
            currentCampaign.status !== lastStatus ||
            progress.sent !== lastSent ||
            progress.failed !== lastFailed ||
            effectivePending !== lastPending ||
            currentNextBatchAt !== lastNextBatchAt;

          if (hasChanged) {
            lastStatus = currentCampaign.status;
            lastSent = progress.sent;
            lastFailed = progress.failed;
            lastPending = effectivePending;
            lastNextBatchAt = currentNextBatchAt;

            // Get the next batch of pending recipients for display
            const nextBatchRecipients =
              currentCampaign.status === 'running' && effectivePending > 0
                ? await getPendingRecipients(id, currentCampaign.batch_size)
                : [];

            const data = {
              type: 'update',
              status: currentCampaign.status,
              progress: {
                total: progress.total,
                sent: progress.sent,
                failed: progress.failed,
                pending: effectivePending
              },
              nextBatch: nextBatchRecipients.map(r => r.email),
              nextBatchAt: currentCampaign.next_batch_at
            };

            if (
              !safeEnqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            ) {
              return false;
            }
          }

          if (
            currentCampaign.status === 'completed' ||
            currentCampaign.status === 'stopped'
          ) {
            safeClose();
            return false;
          }

          return true;
        } catch (error) {
          console.error('SSE update error:', error);
          return !isClosed;
        }
      };

      await sendUpdate();

      if (!isClosed) {
        intervalId = setInterval(async () => {
          const shouldContinue = await sendUpdate();
          if (!shouldContinue) {
            cleanup();
          }
        }, 2000);
      }

      req.signal.addEventListener('abort', () => {
        isClosed = true;
        cleanup();
      });
    },
    cancel() {
      isClosed = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
}
