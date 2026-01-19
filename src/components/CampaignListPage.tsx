'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import { useCampaignPersistence } from '@/hooks/useCampaignPersistence';
import type { CampaignWithProgress } from '@/types/campaign';

interface CampaignListPageProps {
  initialCampaigns?: CampaignWithProgress[];
}

export default function CampaignListPage({ initialCampaigns }: CampaignListPageProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    campaigns,
    loading,
    fetchCampaigns,
    deleteCampaign,
  } = useCampaignPersistence({ initialCampaigns });

  useEffect(() => {
    if (!initialCampaigns) {
      fetchCampaigns();
    }
  }, [initialCampaigns, fetchCampaigns]);

  const handleSelect = (campaign: CampaignWithProgress) => {
    router.push(`/compose?edit=${campaign.id}`);
  };

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await deleteCampaign(deleteId);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border border-gray-200 rounded-lg bg-white">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
                <div className="flex items-center gap-4 mt-3">
                  <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full animate-pulse mt-3" />
              </div>
              <div className="flex items-center gap-2 ml-4">
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
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
    <>
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
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', STATUS_COLORS[campaign.status])}>
                    {STATUS_LABELS[campaign.status]}
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
                    onClick={() => handleSelect(campaign)}
                    className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  >
                    Resume
                  </button>
                )}
                {campaign.status === 'draft' && (
                  <button
                    onClick={() => handleSelect(campaign)}
                    className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setDeleteId(campaign.id)}
                    className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 cursor-pointer"
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

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteId(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Campaign
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this campaign? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
