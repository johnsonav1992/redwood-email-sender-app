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
}

interface UseCampaignStreamProps {
  campaignId: string | null;
  onStatusChange?: (status: CampaignStatus) => Promise<boolean>;
  onSendBatch?: (campaignId: string) => Promise<void>;
}

export function useCampaignStream({ campaignId, onStatusChange, onSendBatch }: UseCampaignStreamProps) {
  const [status, setStatus] = useState<CampaignStatus>('draft');
  const [progress, setProgress] = useState<CampaignProgress>({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [shouldConnect, setShouldConnect] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldConnectRef = useRef(false);

  useEffect(() => {
    shouldConnectRef.current = shouldConnect;
  }, [shouldConnect]);

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
          }
          if (data.progress) {
            setProgress(data.progress);
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
    };
  }, [shouldConnect, campaignId]);

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
    }
  }, [campaignId, onStatusChange]);

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
    }
  }, [campaignId, onStatusChange]);

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
