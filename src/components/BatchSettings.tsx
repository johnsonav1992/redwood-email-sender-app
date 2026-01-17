'use client';

import { useState } from 'react';
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
  const [batchSizeInput, setBatchSizeInput] = useState(String(batchSize));
  const [batchSizeError, setBatchSizeError] = useState<string | null>(null);

  const handleBatchSizeChange = (value: string) => {
    setBatchSizeInput(value);
    setBatchSizeError(null);

    const num = parseInt(value);
    if (!isNaN(num) && num >= 1 && num <= 100) {
      onBatchSizeChange(num);
    }
  };

  const handleBatchSizeBlur = () => {
    const num = parseInt(batchSizeInput);
    if (batchSizeInput.trim() === '' || isNaN(num)) {
      setBatchSizeError('Batch size is required');
    } else if (num < 1) {
      setBatchSizeError('Must be at least 1');
    } else if (num > 100) {
      setBatchSizeError('Must be 100 or less');
    } else {
      setBatchSizeError(null);
    }
  };

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
          value={batchSizeInput}
          onChange={(e) => handleBatchSizeChange(e.target.value)}
          onBlur={handleBatchSizeBlur}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            disabled && 'bg-gray-100 text-gray-500',
            batchSizeError && 'border-red-500 focus:ring-red-500 focus:border-red-500'
          )}
        />
        {batchSizeError ? (
          <p className="text-xs text-red-500 mt-1">{batchSizeError}</p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">How many recipients to BCC per email (1-100)</p>
        )}
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
