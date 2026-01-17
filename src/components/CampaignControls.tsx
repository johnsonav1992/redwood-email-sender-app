'use client';

import { cn } from '@/lib/utils';
import type { CampaignStatus } from '@/types/campaign';

interface CampaignControlsProps {
  status: CampaignStatus;
  recipientCount: number;
  canStart: boolean;
  batchSize?: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export default function CampaignControls({
  status,
  recipientCount,
  canStart,
  batchSize = 30,
  onStart,
  onPause,
  onResume,
  onStop,
}: CampaignControlsProps) {
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const isStopped = status === 'stopped';

  if (isCompleted) {
    return (
      <div className="text-center py-4 px-6 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p className="text-emerald-700 font-medium">Campaign completed successfully</p>
      </div>
    );
  }

  if (isStopped) {
    return (
      <div className="text-center py-4 px-6 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-slate-600 font-medium">Campaign stopped</p>
      </div>
    );
  }

  if (isRunning) {
    return (
      <div className="flex gap-3">
        <button
          onClick={onPause}
          className={cn(
            'flex-1 rounded-lg bg-slate-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-slate-700 cursor-pointer'
          )}
        >
          Pause Campaign
        </button>
        <button
          onClick={onStop}
          className={cn(
            'rounded-lg border-2 border-slate-300 bg-white px-6 py-4 text-lg font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer'
          )}
        >
          Stop
        </button>
      </div>
    );
  }

  if (isPaused) {
    return (
      <div className="flex gap-3">
        <button
          onClick={onResume}
          className={cn(
            'flex-1 rounded-lg bg-redwood px-6 py-4 text-lg font-semibold text-white transition hover:bg-redwood-light cursor-pointer'
          )}
        >
          Resume Campaign
        </button>
        <button
          onClick={onStop}
          className={cn(
            'rounded-lg border-2 border-slate-300 bg-white px-6 py-4 text-lg font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer'
          )}
        >
          Stop
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onStart}
      disabled={!canStart || recipientCount === 0}
      className={cn(
        'w-full rounded-lg bg-redwood px-6 py-4 text-lg font-semibold text-white transition hover:bg-redwood-light cursor-pointer',
        'disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500'
      )}
    >
      Start Campaign ({recipientCount} recipients, {batchSize} per batch)
    </button>
  );
}
