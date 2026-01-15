'use client';

import { cn } from '@/lib/utils';

interface BatchSettingsProps {
  batchSize: number;
  batchDelaySeconds: number;
  onBatchSizeChange: (size: number) => void;
  onBatchDelayChange: (seconds: number) => void;
  disabled?: boolean;
}

export default function BatchSettings({
  batchSize,
  batchDelaySeconds,
  onBatchSizeChange,
  onBatchDelayChange,
  disabled,
}: BatchSettingsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Batch Size (recipients per email)
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={batchSize}
          onChange={(e) => onBatchSizeChange(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            disabled && 'bg-gray-100 text-gray-500'
          )}
        />
        <p className="text-xs text-gray-500 mt-1">How many recipients to BCC per email (1-100)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Delay Between Batches
        </label>
        <select
          value={batchDelaySeconds}
          onChange={(e) => onBatchDelayChange(parseInt(e.target.value))}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            disabled && 'bg-gray-100 text-gray-500'
          )}
        >
          <option value={30}>30 seconds</option>
          <option value={60}>1 minute</option>
          <option value={120}>2 minutes</option>
          <option value={180}>3 minutes</option>
          <option value={300}>5 minutes</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Wait time between sending batches</p>
      </div>
    </div>
  );
}
