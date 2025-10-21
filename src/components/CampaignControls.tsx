'use client';

import { cn } from '@/lib/utils';

interface CampaignControlsProps {
  isRunning: boolean;
  recipientList: string[];
  subject: string;
  htmlBody: string;
  onStart: () => void;
  onStop: () => void;
}

export default function CampaignControls({
  isRunning,
  recipientList,
  subject,
  htmlBody,
  onStart,
  onStop
}: CampaignControlsProps) {
  return (
    <div>
      {!isRunning ? (
        <button
          onClick={onStart}
          disabled={recipientList.length === 0 || !subject || !htmlBody}
          className={cn(
            'w-full',
            'rounded-lg',
            'bg-blue-600',
            'px-6',
            'py-4',
            'text-lg',
            'font-bold',
            'text-white',
            'transition',
            'hover:bg-blue-700',
            'disabled:cursor-not-allowed',
            'disabled:bg-gray-300'
          )}
        >
          Start Campaign (Sends 1 email every minute)
        </button>
      ) : (
        <button
          onClick={onStop}
          className={cn(
            'w-full',
            'rounded-lg',
            'bg-red-600',
            'px-6',
            'py-4',
            'text-lg',
            'font-bold',
            'text-white',
            'transition',
            'hover:bg-red-700'
          )}
        >
          Stop Campaign
        </button>
      )}
    </div>
  );
}
