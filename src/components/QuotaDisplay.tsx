'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface QuotaData {
  sentToday: number;
  limit: number;
  remaining: number;
  resetTime: string;
}

interface QuotaDisplayProps {
  onRefreshReady?: (refreshFn: () => void) => void;
}

export default function QuotaDisplay({ onRefreshReady }: QuotaDisplayProps) {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/quota');

      if (!response.ok) {
        throw new Error('Failed to fetch quota');
      }

      const data = await response.json();
      setQuota(data);
    } catch (err) {
      console.error('Error fetching quota:', err);
      setError('Unable to load quota');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
    // Expose refresh function to parent
    if (onRefreshReady) {
      onRefreshReady(fetchQuota);
    }
    // Refresh quota every 5 minutes
    const interval = setInterval(fetchQuota, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [onRefreshReady]);

  if (loading) {
    return (
      <div
        className={cn(
          'flex',
          'items-center',
          'gap-2',
          'rounded-lg',
          'bg-gray-100',
          'px-4',
          'py-2',
          'text-sm'
        )}
      >
        <div
          className={cn(
            'h-2',
            'w-2',
            'animate-pulse',
            'rounded-full',
            'bg-gray-400'
          )}
        />
        <span className={cn('text-gray-600')}>Loading quota...</span>
      </div>
    );
  }

  if (error || !quota) {
    return (
      <div
        className={cn(
          'flex',
          'items-center',
          'gap-2',
          'rounded-lg',
          'bg-red-50',
          'px-4',
          'py-2',
          'text-sm'
        )}
      >
        <span className={cn('text-red-600')}>Quota unavailable</span>
      </div>
    );
  }

  const percentage = (quota.remaining / quota.limit) * 100;
  const isLow = percentage < 20;
  const isMedium = percentage < 50 && percentage >= 20;

  return (
    <div
      className={cn(
        'flex',
        'items-center',
        'gap-3',
        'rounded-lg',
        'border-2',
        'bg-white',
        'px-4',
        'py-2',
        isLow && 'border-red-300',
        isMedium && 'border-yellow-300',
        !isLow && !isMedium && 'border-green-300'
      )}
    >
      <div className={cn('flex', 'items-center', 'gap-2')}>
        <div
          className={cn(
            'h-2',
            'w-2',
            'rounded-full',
            isLow && 'bg-red-500',
            isMedium && 'bg-yellow-500',
            !isLow && !isMedium && 'bg-green-500'
          )}
        />
        <div className={cn('flex', 'flex-col')}>
          <div className={cn('text-xs', 'text-gray-600')}>Daily Quota</div>
          <div className={cn('flex', 'items-baseline', 'gap-1', 'whitespace-nowrap')}>
            <span className={cn('text-lg', 'font-bold', 'text-gray-900')}>{quota.remaining.toLocaleString()}</span>
            <span className={cn('text-sm', 'text-gray-400')}>/ {quota.limit.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <button
        onClick={fetchQuota}
        className={cn(
          'rounded',
          'p-1',
          'text-gray-400',
          'transition',
          'hover:bg-gray-100',
          'hover:text-gray-600'
        )}
        title="Refresh quota"
      >
        <svg
          className={cn('h-4', 'w-4')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}
