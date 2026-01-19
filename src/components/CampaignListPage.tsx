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
                <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-1" />
                <div className="h-4 w-full bg-gray-50 rounded animate-pulse mt-2" />
                <div className="h-4 w-3/4 bg-gray-50 rounded animate-pulse mt-1" />
                <div className="flex items-center gap-4 mt-3">
                  <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="h-3 w-14 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-8 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex items-center gap-4 mt-2">
                    <div className="h-3 w-14 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-18 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 ml-4">
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
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

        const createdDate = new Date(campaign.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        const updatedDate = new Date(campaign.updated_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });

        const bodyPreview = campaign.body
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120);

        const emailsPerMinute = Math.round((campaign.batch_size / campaign.batch_delay_seconds) * 60);

        return (
          <div
            key={campaign.id}
            className="p-4 border rounded-lg hover:border-slate-400 transition-colors bg-white"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 truncate">
                    {campaign.name || campaign.subject}
                  </h4>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full shrink-0', STATUS_COLORS[campaign.status])}>
                    {STATUS_LABELS[campaign.status]}
                  </span>
                </div>
                {campaign.name && campaign.name !== campaign.subject && (
                  <p className="text-sm text-gray-600 truncate mt-1">
                    Subject: {campaign.subject}
                  </p>
                )}

                {bodyPreview && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                    {bodyPreview}{bodyPreview.length >= 120 ? '...' : ''}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {campaign.total_recipients} recipients
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {emailsPerMinute}/min
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {createdDate}
                  </span>
                  {campaign.status !== 'draft' && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {updatedDate}
                    </span>
                  )}
                </div>

                {campaign.status !== 'draft' && (
                  <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-600">Progress</span>
                      <span className="text-gray-900 font-medium">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          campaign.status === 'completed' ? 'bg-green-500' : 'bg-slate-500'
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-green-600">{campaign.sent_count} sent</span>
                      {campaign.pending_count > 0 && (
                        <span className="text-gray-500">{campaign.pending_count} pending</span>
                      )}
                      {campaign.failed_count > 0 && (
                        <span className="text-red-500">{campaign.failed_count} failed</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 ml-4">
                {canResume && (
                  <button
                    onClick={() => handleSelect(campaign)}
                    className="text-sm px-3 py-1.5 rounded bg-slate-700 text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Resume
                  </button>
                )}
                {campaign.status === 'draft' && (
                  <button
                    onClick={() => handleSelect(campaign)}
                    className="text-sm px-3 py-1.5 rounded bg-slate-700 text-white hover:bg-slate-800 cursor-pointer"
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
