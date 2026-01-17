'use client';

import { cn } from '@/lib/utils';
import type { Progress } from '@/types/email';

interface CampaignProgressProps {
  progress: Progress;
  isRunning: boolean;
  isConnected?: boolean;
}

export default function CampaignProgress({
  progress,
  isRunning,
  isConnected,
}: CampaignProgressProps) {
  if (progress.total === 0) {
    return null;
  }

  const progressPercent =
    progress.total > 0
      ? ((progress.sent + progress.failed) / progress.total) * 100
      : 0;

  const isCompleted =
    !isRunning && progress.sent + progress.failed === progress.total;
  const isPaused =
    !isRunning &&
    progress.sent + progress.failed < progress.total &&
    progress.sent > 0;

  return (
    <div
      className={cn(
        'rounded-lg',
        'border-2',
        'border-gray-200',
        'bg-gray-50',
        'p-6'
      )}
    >
      <div className={cn('mb-4', 'flex', 'items-center', 'justify-between')}>
        <h3 className={cn('text-lg', 'font-bold', 'text-gray-900')}>
          Campaign Progress
        </h3>
        {isRunning && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold',
              isConnected ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500')} />
            {isConnected ? 'Processing...' : 'Connecting...'}
          </div>
        )}
        {isCompleted && (
          <div
            className={cn(
              'rounded-full',
              'bg-green-100',
              'px-4',
              'py-2',
              'text-sm',
              'font-semibold',
              'text-green-800'
            )}
          >
            Completed
          </div>
        )}
        {isPaused && (
          <div
            className={cn(
              'rounded-full',
              'bg-yellow-100',
              'px-4',
              'py-2',
              'text-sm',
              'font-semibold',
              'text-yellow-800'
            )}
          >
            Paused
          </div>
        )}
      </div>

      <div
        className={cn(
          'relative',
          'mb-4',
          'h-8',
          'overflow-hidden',
          'rounded-full',
          'bg-gray-200'
        )}
      >
        <div
          className={cn(
            'h-full',
            'bg-gradient-to-r',
            'from-green-500',
            'to-blue-500',
            'transition-all',
            'duration-500'
          )}
          style={{ width: `${progressPercent}%` }}
        />
        <span
          className={cn(
            'absolute',
            'inset-0',
            'flex',
            'items-center',
            'justify-center',
            'text-sm',
            'font-bold',
            'text-gray-900'
          )}
        >
          {Math.round(progressPercent)}%
        </span>
      </div>

      <div className={cn('grid', 'grid-cols-4', 'gap-4')}>
        <div
          className={cn(
            'rounded-lg',
            'border-2',
            'border-gray-200',
            'bg-white',
            'p-4',
            'text-center'
          )}
        >
          <div className={cn('mb-1', 'text-xs', 'text-gray-600')}>Total</div>
          <div className={cn('text-2xl', 'font-bold', 'text-gray-900')}>
            {progress.total}
          </div>
        </div>
        <div
          className={cn(
            'rounded-lg',
            'border-2',
            'border-green-500',
            'bg-white',
            'p-4',
            'text-center'
          )}
        >
          <div className={cn('mb-1', 'text-xs', 'text-gray-600')}>Sent</div>
          <div className={cn('text-2xl', 'font-bold', 'text-gray-900')}>
            {progress.sent}
          </div>
        </div>
        <div
          className={cn(
            'rounded-lg',
            'border-2',
            'border-red-500',
            'bg-white',
            'p-4',
            'text-center'
          )}
        >
          <div className={cn('mb-1', 'text-xs', 'text-gray-600')}>Failed</div>
          <div className={cn('text-2xl', 'font-bold', 'text-gray-900')}>
            {progress.failed}
          </div>
        </div>
        <div
          className={cn(
            'rounded-lg',
            'border-2',
            'border-yellow-500',
            'bg-white',
            'p-4',
            'text-center'
          )}
        >
          <div className={cn('mb-1', 'text-xs', 'text-gray-600')}>
            Remaining
          </div>
          <div className={cn('text-2xl', 'font-bold', 'text-gray-900')}>
            {progress.total - progress.sent - progress.failed}
          </div>
        </div>
      </div>
    </div>
  );
}
