'use client';

import { cn } from '@/lib/utils';
import type { CampaignWithProgress, CampaignStatus } from '@/types/campaign';

interface CampaignListProps {
  campaigns: CampaignWithProgress[];
  onSelect: (campaign: CampaignWithProgress) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

const statusColors: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  running: 'bg-blue-100 text-blue-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  stopped: 'bg-red-100 text-red-700',
};

const statusLabels: Record<CampaignStatus, string> = {
  draft: 'Draft',
  running: 'Running',
  paused: 'Paused',
  completed: 'Completed',
  stopped: 'Stopped',
};

export default function CampaignList({ campaigns, onSelect, onDelete, loading }: CampaignListProps) {
  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <svg
          className="animate-spin h-6 w-6 mx-auto mb-2 text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Loading campaigns...
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No campaigns yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {campaigns.map((campaign) => {
        const progress = campaign.total_recipients > 0
          ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100)
          : 0;

        const canResume = campaign.status === 'paused' && campaign.pending_count > 0;
        const canDelete = campaign.status !== 'running';

        return (
          <div
            key={campaign.id}
            className="p-4 border rounded-lg hover:border-blue-300 transition-colors bg-white"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 truncate">
                    {campaign.name || campaign.subject}
                  </h4>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColors[campaign.status])}>
                    {statusLabels[campaign.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate mt-1">
                  {campaign.subject}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>{campaign.total_recipients} recipients</span>
                  <span>{campaign.sent_count} sent</span>
                  {campaign.failed_count > 0 && (
                    <span className="text-red-500">{campaign.failed_count} failed</span>
                  )}
                </div>

                {campaign.status !== 'draft' && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          campaign.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                {canResume && (
                  <button
                    onClick={() => onSelect(campaign)}
                    className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Resume
                  </button>
                )}
                {campaign.status === 'draft' && (
                  <button
                    onClick={() => onSelect(campaign)}
                    className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Start
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(campaign.id)}
                    className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
