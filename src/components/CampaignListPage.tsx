'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import { useCampaignPersistence } from '@/hooks/useCampaignPersistence';
import Tooltip from '@/components/Tooltip';
import type { CampaignWithProgress } from '@/types/campaign';

interface CampaignListPageProps {
  initialCampaigns?: CampaignWithProgress[];
}

export default function CampaignListPage({
  initialCampaigns
}: CampaignListPageProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { campaigns, loading, fetchCampaigns, deleteCampaign, duplicateCampaign } =
    useCampaignPersistence({ initialCampaigns });

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

  const handleDuplicate = async (campaign: CampaignWithProgress) => {
    const newCampaign = await duplicateCampaign(campaign.id);
    if (newCampaign) {
      router.push(`/compose?edit=${newCampaign.id}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
                </div>
                <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-100" />
                <div className="mt-2 h-4 w-full animate-pulse rounded bg-gray-50" />
                <div className="mt-1 h-4 w-3/4 animate-pulse rounded bg-gray-50" />
                <div className="mt-3 flex items-center gap-4">
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="mt-3 rounded-lg bg-gray-50 p-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="h-3 w-14 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-8 animate-pulse rounded bg-gray-200" />
                  </div>
                  <div className="h-1.5 w-full animate-pulse rounded-full bg-gray-200" />
                  <div className="mt-2 flex items-center gap-4">
                    <div className="h-3 w-14 animate-pulse rounded bg-gray-100" />
                    <div className="h-3 w-18 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              </div>
              <div className="ml-4 flex flex-col items-end gap-2">
                <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
                <div className="h-8 w-16 animate-pulse rounded bg-gray-100" />
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
        {campaigns.map(campaign => {
          const progress =
            campaign.total_recipients > 0
              ? Math.round(
                  ((campaign.sent_count + campaign.failed_count) /
                    campaign.total_recipients) *
                    100
                )
              : 0;

          const canResume =
            campaign.status === 'paused' && campaign.pending_count > 0;
          const canDelete = campaign.status !== 'running';

          const createdDate = new Date(campaign.created_at).toLocaleDateString(
            'en-US',
            {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }
          );

          const updatedDate = new Date(campaign.updated_at).toLocaleDateString(
            'en-US',
            {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            }
          );

          const bodyPreview = campaign.body
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120);

          const delayDisplay =
            campaign.batch_delay_seconds >= 60
              ? `${Math.round(campaign.batch_delay_seconds / 60)}m`
              : `${campaign.batch_delay_seconds}s`;

          return (
            <div
              key={campaign.id}
              className="rounded-lg border bg-white p-4 transition-colors hover:border-slate-400"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate font-medium text-gray-900">
                      {campaign.name || campaign.subject}
                    </h4>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-xs',
                        STATUS_COLORS[campaign.status]
                      )}
                    >
                      {STATUS_LABELS[campaign.status]}
                    </span>
                  </div>
                  {campaign.name && campaign.name !== campaign.subject && (
                    <p className="mt-1 truncate text-sm text-gray-600">
                      Subject: {campaign.subject}
                    </p>
                  )}

                  {bodyPreview && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                      {bodyPreview}
                      {bodyPreview.length >= 120 ? '...' : ''}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <Tooltip content="Total recipients in this campaign">
                      <span className="flex cursor-default items-center gap-1">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {campaign.total_recipients} recipients
                      </span>
                    </Tooltip>
                    <Tooltip content="Batch size and delay between batches">
                      <span className="flex cursor-default items-center gap-1">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        {campaign.batch_size} / {delayDisplay}
                      </span>
                    </Tooltip>
                    <Tooltip content="Campaign created">
                      <span className="flex cursor-default items-center gap-1">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {createdDate}
                      </span>
                    </Tooltip>
                    {campaign.status !== 'draft' && (
                      <Tooltip content="Last activity">
                        <span className="flex cursor-default items-center gap-1">
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {updatedDate}
                        </span>
                      </Tooltip>
                    )}
                  </div>

                  {campaign.status !== 'draft' && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-2">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium text-gray-900">
                          {progress}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            campaign.status === 'completed'
                              ? 'bg-green-500'
                              : 'bg-slate-500'
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        <Tooltip content="Emails successfully delivered">
                          <span className="cursor-default text-green-600">
                            {campaign.sent_count} sent
                          </span>
                        </Tooltip>
                        {campaign.pending_count > 0 && (
                          <Tooltip content="Emails waiting to be sent">
                            <span className="cursor-default text-gray-500">
                              {campaign.pending_count} pending
                            </span>
                          </Tooltip>
                        )}
                        {campaign.failed_count > 0 && (
                          <Tooltip content="Emails that failed to send">
                            <span className="cursor-default text-red-500">
                              {campaign.failed_count} failed
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-4 flex flex-col items-end gap-2">
                  {campaign.status === 'running' && (
                    <button
                      onClick={() => handleSelect(campaign)}
                      className="w-20 cursor-pointer rounded-lg bg-slate-700 py-2.5 text-sm text-white hover:bg-slate-800 active:bg-slate-900"
                    >
                      Monitor
                    </button>
                  )}
                  {canResume && (
                    <button
                      onClick={() => handleSelect(campaign)}
                      className="w-20 cursor-pointer rounded-lg bg-slate-700 py-2.5 text-sm text-white hover:bg-slate-800 active:bg-slate-900"
                    >
                      Resume
                    </button>
                  )}
                  {campaign.status === 'draft' && (
                    <button
                      onClick={() => handleSelect(campaign)}
                      className="w-20 cursor-pointer rounded-lg bg-slate-700 py-2.5 text-sm text-white hover:bg-slate-800 active:bg-slate-900"
                    >
                      Edit
                    </button>
                  )}
                  {(campaign.status === 'completed' ||
                    campaign.status === 'stopped') && (
                    <button
                      onClick={() => handleSelect(campaign)}
                      className="w-20 cursor-pointer rounded-lg border border-gray-300 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                    >
                      View
                    </button>
                  )}
                  {campaign.status !== 'running' && (
                    <button
                      onClick={() => handleDuplicate(campaign)}
                      className="w-20 cursor-pointer rounded-lg border border-gray-300 py-2.5 text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100"
                    >
                      Duplicate
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteId(campaign.id)}
                      className="w-20 cursor-pointer rounded-lg border border-gray-300 py-2.5 text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100"
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
          <div className="relative mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Delete Campaign
            </h3>
            <p className="mb-6 text-gray-600">
              Are you sure you want to delete this campaign? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="cursor-pointer rounded-lg px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="cursor-pointer rounded-lg bg-red-600 px-5 py-2.5 text-sm text-white hover:bg-red-700 active:bg-red-800"
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
