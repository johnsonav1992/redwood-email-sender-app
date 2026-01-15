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
      <div className="text-center py-4 px-6 bg-green-50 rounded-lg">
        <p className="text-green-700 font-medium">Campaign completed!</p>
      </div>
    );
  }

  if (isStopped) {
    return (
      <div className="text-center py-4 px-6 bg-gray-50 rounded-lg">
        <p className="text-gray-700 font-medium">Campaign stopped</p>
      </div>
    );
  }

  if (isRunning) {
    return (
      <div className="flex gap-3">
        <button
          onClick={onPause}
          className={cn(
            'flex-1 rounded-lg bg-yellow-500 px-6 py-4 text-lg font-bold text-white transition hover:bg-yellow-600'
          )}
        >
          Pause Campaign
        </button>
        <button
          onClick={onStop}
          className={cn(
            'rounded-lg bg-red-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-red-700'
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
            'flex-1 rounded-lg bg-blue-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-blue-700'
          )}
        >
          Resume Campaign
        </button>
        <button
          onClick={onStop}
          className={cn(
            'rounded-lg bg-red-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-red-700'
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
        'w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-blue-700',
        'disabled:cursor-not-allowed disabled:bg-gray-300'
      )}
    >
      Start Campaign ({recipientCount} recipients, {batchSize} per batch)
    </button>
  );
}
