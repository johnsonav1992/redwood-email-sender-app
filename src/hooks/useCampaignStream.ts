import { useState, useEffect, useCallback, useRef } from 'react';
import type { CampaignStatus } from '@/types/campaign';

interface CampaignProgress {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

interface StreamUpdate {
  type: 'update' | 'deleted';
  status?: CampaignStatus;
  progress?: CampaignProgress;
  nextBatch?: string[];
}

interface UseCampaignStreamProps {
  campaignId: string | null;
  batchDelaySeconds?: number;
  onStatusChange?: (status: CampaignStatus) => Promise<boolean>;
  onSendBatch?: (campaignId: string) => Promise<void>;
}

export function useCampaignStream({ campaignId, batchDelaySeconds = 60, onStatusChange, onSendBatch }: UseCampaignStreamProps) {
  const [status, setStatus] = useState<CampaignStatus>('draft');
  const [progress, setProgress] = useState<CampaignProgress>({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [nextBatchIn, setNextBatchIn] = useState<number | null>(null);
  const [nextBatchEmails, setNextBatchEmails] = useState<string[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldConnectRef = useRef(false);
  const statusRef = useRef<CampaignStatus>('draft');

  useEffect(() => {
    shouldConnectRef.current = shouldConnect;
  }, [shouldConnect]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setNextBatchIn(null);
  }, []);

  const startCountdown = useCallback((seconds: number) => {
    clearCountdown();
    setNextBatchIn(seconds);
    countdownIntervalRef.current = setInterval(() => {
      setNextBatchIn((prev) => {
        if (prev === null || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearCountdown]);

  useEffect(() => {
    if (status !== 'running') {
      clearCountdown();
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
    }
  }, [status, clearCountdown]);

  const scheduleNextBatch = useCallback((id: string, delayMs: number, pendingCount: number) => {
    if (pendingCount > 0 && statusRef.current === 'running' && !batchTimeoutRef.current) {
      startCountdown(Math.floor(delayMs / 1000));
      batchTimeoutRef.current = setTimeout(() => {
        batchTimeoutRef.current = null;
        clearCountdown();
        if (statusRef.current === 'running' && onSendBatch) {
          onSendBatch(id);
        }
      }, delayMs);
    }
  }, [onSendBatch, startCountdown, clearCountdown]);

  useEffect(() => {
    if (!shouldConnect || !campaignId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
      clearCountdown();
      return;
    }

    const connectToStream = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`/api/campaigns/${campaignId}/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setLastError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data: StreamUpdate = JSON.parse(event.data);

          if (data.type === 'deleted') {
            setShouldConnect(false);
            return;
          }

          if (data.status) {
            setStatus(data.status);
            if (data.status === 'completed' || data.status === 'stopped') {
              setShouldConnect(false);
            }
          }
          if (data.progress) {
            setProgress(data.progress);
            if (data.progress.pending > 0 && data.status === 'running' && campaignId) {
              scheduleNextBatch(campaignId, batchDelaySeconds * 1000, data.progress.pending);
            }
          }
          if (data.nextBatch) {
            setNextBatchEmails(data.nextBatch);
          }
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        retryTimeoutRef.current = setTimeout(() => {
          if (shouldConnectRef.current) {
            connectToStream();
          }
        }, 5000);
      };
    };

    connectToStream();

    return () => {
      setIsConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
      clearCountdown();
    };
  }, [shouldConnect, campaignId, batchDelaySeconds, scheduleNextBatch, clearCountdown]);

  const startCampaign = useCallback(async (overrideCampaignId?: string) => {
    const id = overrideCampaignId || campaignId;
    if (!id) return;

    setLastError(null);
    const success = await onStatusChange?.('running');
    if (success !== false) {
      setStatus('running');
      setShouldConnect(true);
      onSendBatch?.(id);
    }
  }, [campaignId, onStatusChange, onSendBatch]);

  const pauseCampaign = useCallback(async () => {
    if (!campaignId) return;

    const success = await onStatusChange?.('paused');
    if (success !== false) {
      setStatus('paused');
      clearCountdown();
    }
  }, [campaignId, onStatusChange, clearCountdown]);

  const resumeCampaign = useCallback(async () => {
    if (!campaignId || status !== 'paused') return;

    setLastError(null);
    const success = await onStatusChange?.('running');
    if (success !== false) {
      setStatus('running');
      setShouldConnect(true);
      onSendBatch?.(campaignId);
    }
  }, [campaignId, status, onStatusChange, onSendBatch]);

  const stopCampaign = useCallback(async () => {
    if (!campaignId) return;

    const success = await onStatusChange?.('stopped');
    if (success !== false) {
      setStatus('stopped');
      setShouldConnect(false);
      clearCountdown();
    }
  }, [campaignId, onStatusChange, clearCountdown]);

  const setInitialStatus = useCallback((newStatus: CampaignStatus) => {
    setStatus(newStatus);
    if (newStatus === 'running') {
      setShouldConnect(true);
    }
  }, []);

  const setInitialProgress = useCallback((newProgress: CampaignProgress) => {
    setProgress(newProgress);
  }, []);

  return {
    status,
    progress,
    isConnected,
    lastError,
    nextBatchIn,
    nextBatchEmails,
    isRunning: status === 'running',
    isPaused: status === 'paused',
    isCompleted: status === 'completed',
    isStopped: status === 'stopped',
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    stopCampaign,
    setInitialStatus,
    setInitialProgress,
  };
}
