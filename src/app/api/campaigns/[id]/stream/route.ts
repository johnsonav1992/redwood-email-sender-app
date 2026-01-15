import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCampaignById, getCampaignProgress } from '@/lib/db';

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

      const sendUpdate = async (): Promise<boolean> => {
        if (isClosed) return false;

        try {
          const currentCampaign = await getCampaignById(id);
          const progress = await getCampaignProgress(id);

          if (isClosed) return false;

          if (!currentCampaign) {
            isClosed = true;
            cleanup();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'deleted' })}\n\n`));
            controller.close();
            return false;
          }

          const hasChanged =
            currentCampaign.status !== lastStatus ||
            progress.sent !== lastSent ||
            progress.failed !== lastFailed;

          if (hasChanged) {
            lastStatus = currentCampaign.status;
            lastSent = progress.sent;
            lastFailed = progress.failed;

            const data = {
              type: 'update',
              status: currentCampaign.status,
              progress: {
                total: progress.total,
                sent: progress.sent,
                failed: progress.failed,
                pending: progress.pending,
              },
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          }

          if (currentCampaign.status === 'completed' || currentCampaign.status === 'stopped') {
            isClosed = true;
            cleanup();
            controller.close();
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
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
