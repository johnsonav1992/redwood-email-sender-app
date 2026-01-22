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

  const remaining = progress.total - progress.sent - progress.failed;
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
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">
          Campaign Progress
        </h3>
        {isRunning && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium',
              isConnected
                ? 'bg-slate-700 text-white'
                : 'bg-slate-200 text-slate-600'
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
              )}
            />
            {isConnected ? 'Sending...' : 'Connecting...'}
          </div>
        )}
        {isCompleted && (
          <div className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700">
            Completed
          </div>
        )}
        {isPaused && (
          <div className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-700">
            Paused
          </div>
        )}
      </div>
      <div className="relative mb-4 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isCompleted ? 'bg-emerald-500' : 'bg-redwood'
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Total
          </div>
          <div className="text-xl font-bold text-slate-800 mt-1">
            {progress.total}
          </div>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
          <div className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
            Sent
          </div>
          <div className="text-xl font-bold text-slate-800 mt-1">
            {progress.sent}
          </div>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
          <div className="text-xs font-medium text-red-600 uppercase tracking-wide">
            Failed
          </div>
          <div className="text-xl font-bold text-slate-800 mt-1">
            {progress.failed}
          </div>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Remaining
          </div>
          <div className="text-xl font-bold text-slate-800 mt-1">
            {remaining}
          </div>
        </div>
      </div>
    </div>
  );
}
