import { useState, useRef, useEffect } from 'react';

interface UseCampaignProps {
  onSendBatch: () => Promise<boolean>;
}

export function useCampaign({ onSendBatch }: UseCampaignProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [nextBatchIn, setNextBatchIn] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const startCountdown = () => {
    setNextBatchIn(60);
    countdownRef.current = setInterval(() => {
      setNextBatchIn(prev => {
        if (prev === null || prev <= 1) {
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCampaign = () => {
    setIsRunning(false);
    setNextBatchIn(null);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const startCampaign = async () => {
    setIsRunning(true);

    // Send first batch immediately
    const shouldContinue = await onSendBatch();

    if (!shouldContinue) {
      stopCampaign();
      return;
    }

    // Set up interval for subsequent batches
    intervalRef.current = setInterval(async () => {
      const shouldContinue = await onSendBatch();
      if (!shouldContinue) {
        stopCampaign();
      }
    }, 60000);

    startCountdown();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return {
    isRunning,
    nextBatchIn,
    startCampaign,
    stopCampaign
  };
}
