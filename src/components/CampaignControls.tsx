'use client';

import { cn } from '@/lib/utils';
import type { CampaignStatus } from '@/types/campaign';

interface CampaignControlsProps {
  status: CampaignStatus;
  recipientCount: number;
  canStart: boolean;
  canSaveDraft: boolean;
  batchSize?: number;
  onStart: () => void;
  onSaveDraft: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export default function CampaignControls({
  status,
  recipientCount,
  canStart,
  canSaveDraft,
  batchSize = 30,
  onStart,
  onSaveDraft,
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
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onPause}
          className={cn(
            'flex-1 rounded-lg bg-slate-600 px-6 py-4 text-base sm:text-lg font-semibold text-white transition',
            'hover:bg-slate-700 active:bg-slate-800 cursor-pointer'
          )}
        >
          Pause Campaign
        </button>
        <button
          onClick={onStop}
          className={cn(
            'rounded-lg border-2 border-slate-300 bg-white px-6 py-4 text-base sm:text-lg font-semibold text-slate-600 transition',
            'hover:bg-slate-50 active:bg-slate-100 cursor-pointer'
          )}
        >
          Stop
        </button>
      </div>
    );
  }

  if (isPaused) {
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onResume}
          className={cn(
            'flex-1 rounded-lg bg-redwood px-6 py-4 text-base sm:text-lg font-semibold text-white transition',
            'hover:bg-redwood-light active:bg-redwood-dark cursor-pointer'
          )}
        >
          Resume Campaign
        </button>
        <button
          onClick={onStop}
          className={cn(
            'rounded-lg border-2 border-slate-300 bg-white px-6 py-4 text-base sm:text-lg font-semibold text-slate-600 transition',
            'hover:bg-slate-50 active:bg-slate-100 cursor-pointer'
          )}
        >
          Stop
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {canSaveDraft && (
        <button
          onClick={onSaveDraft}
          className={cn(
            'rounded-lg border-2 border-slate-300 bg-white px-6 py-4 text-base sm:text-lg font-semibold text-slate-600 transition',
            'hover:bg-slate-50 active:bg-slate-100 cursor-pointer'
          )}
        >
          Save Draft
        </button>
      )}
      <button
        onClick={onStart}
        disabled={!canStart || recipientCount === 0}
        className={cn(
          'flex-1 rounded-lg bg-redwood px-6 py-4 text-base sm:text-lg font-semibold text-white transition',
          'hover:bg-redwood-light active:bg-redwood-dark cursor-pointer',
          'disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500'
        )}
      >
        Start Campaign ({recipientCount} recipients, {batchSize} per batch)
      </button>
    </div>
  );
}
