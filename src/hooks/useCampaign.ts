import { useState, useRef, useEffect, useCallback } from 'react';
import type { CampaignStatus } from '@/types/campaign';

interface SendBatchResult {
  success: boolean;
  completed: boolean;
  quotaExhausted?: boolean;
  error?: string;
}

interface UseCampaignProps {
  campaignId: string | null;
  batchDelaySeconds?: number;
  onSendBatch: () => Promise<SendBatchResult>;
  onStatusChange?: (status: CampaignStatus) => Promise<boolean>;
  onQuotaRefresh?: () => void;
}

export function useCampaign({
  campaignId,
  batchDelaySeconds = 60,
  onSendBatch,
  onStatusChange,
  onQuotaRefresh,
}: UseCampaignProps) {
  const [status, setStatus] = useState<CampaignStatus>('draft');
  const [nextBatchIn, setNextBatchIn] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setNextBatchIn(null);
  }, []);

  const startCountdown = useCallback(() => {
    setNextBatchIn(batchDelaySeconds);
    countdownRef.current = setInterval(() => {
      setNextBatchIn((prev) => {
        if (prev === null || prev <= 1) {
          return batchDelaySeconds;
        }
        return prev - 1;
      });
    }, 1000);
  }, [batchDelaySeconds]);

  const processBatch = useCallback(async (): Promise<boolean> => {
    if (!isRunningRef.current) return false;

    const result = await onSendBatch();

    if (result.quotaExhausted) {
      setStatus('paused');
      setLastError('Daily quota exhausted. Campaign paused.');
      clearTimers();
      return false;
    }

    if (!result.success) {
      setLastError(result.error || 'Failed to send batch');
      return true;
    }

    if (result.completed) {
      setStatus('completed');
      clearTimers();
      isRunningRef.current = false;
      return false;
    }

    onQuotaRefresh?.();
    return true;
  }, [onSendBatch, onQuotaRefresh, clearTimers]);

  const startCampaign = useCallback(async () => {
    if (!campaignId) return;

    setLastError(null);
    isRunningRef.current = true;

    const statusChanged = await onStatusChange?.('running');
    if (statusChanged === false) {
      isRunningRef.current = false;
      return;
    }

    setStatus('running');

    const shouldContinue = await processBatch();

    if (!shouldContinue) {
      isRunningRef.current = false;
      return;
    }

    intervalRef.current = setInterval(async () => {
      const shouldContinue = await processBatch();
      if (!shouldContinue) {
        clearTimers();
        isRunningRef.current = false;
      }
    }, batchDelaySeconds * 1000);

    startCountdown();
  }, [campaignId, batchDelaySeconds, onStatusChange, processBatch, startCountdown, clearTimers]);

  const pauseCampaign = useCallback(async () => {
    isRunningRef.current = false;
    clearTimers();

    const statusChanged = await onStatusChange?.('paused');
    if (statusChanged !== false) {
      setStatus('paused');
    }
  }, [onStatusChange, clearTimers]);

  const resumeCampaign = useCallback(async () => {
    if (!campaignId || status !== 'paused') return;

    setLastError(null);
    isRunningRef.current = true;

    const statusChanged = await onStatusChange?.('running');
    if (statusChanged === false) {
      isRunningRef.current = false;
      return;
    }

    setStatus('running');

    const shouldContinue = await processBatch();

    if (!shouldContinue) {
      isRunningRef.current = false;
      return;
    }

    intervalRef.current = setInterval(async () => {
      const shouldContinue = await processBatch();
      if (!shouldContinue) {
        clearTimers();
        isRunningRef.current = false;
      }
    }, batchDelaySeconds * 1000);

    startCountdown();
  }, [campaignId, status, batchDelaySeconds, onStatusChange, processBatch, startCountdown, clearTimers]);

  const stopCampaign = useCallback(async () => {
    isRunningRef.current = false;
    clearTimers();

    const statusChanged = await onStatusChange?.('stopped');
    if (statusChanged !== false) {
      setStatus('stopped');
    }
  }, [onStatusChange, clearTimers]);

  const setInitialStatus = useCallback((newStatus: CampaignStatus) => {
    setStatus(newStatus);
  }, []);

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    if (!campaignId) {
      setStatus('draft');
      setLastError(null);
      clearTimers();
    }
  }, [campaignId, clearTimers]);

  return {
    status,
    nextBatchIn,
    lastError,
    isRunning: status === 'running',
    isPaused: status === 'paused',
    isCompleted: status === 'completed',
    isStopped: status === 'stopped',
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    stopCampaign,
    setInitialStatus,
  };
}
