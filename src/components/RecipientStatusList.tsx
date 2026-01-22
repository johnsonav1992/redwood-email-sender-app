'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Recipient } from '@/types/campaign';

interface RecipientStatusListProps {
  campaignId: string;
  initialRecipients: Recipient[];
  initialTotal: number;
  progress: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
}

type FilterStatus = 'all' | 'sent' | 'pending' | 'failed';

export default function RecipientStatusList({
  campaignId,
  initialRecipients,
  initialTotal,
  progress
}: RecipientStatusListProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRecipients = useCallback(
    async (
      status: FilterStatus,
      offset: number = 0,
      append: boolean = false
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          status,
          limit: '50',
          offset: offset.toString()
        });
        const response = await fetch(`/api/campaigns/${campaignId}?${params}`);
        const data = await response.json();

        if (response.ok) {
          if (append) {
            setRecipients(prev => [...prev, ...data.recipients]);
          } else {
            setRecipients(data.recipients);
          }
          setTotal(data.recipientsTotal);
        }
      } catch (error) {
        console.error('Failed to fetch recipients:', error);
      } finally {
        setLoading(false);
      }
    },
    [campaignId]
  );

  const lastFetchedProgressRef = useRef({
    sent: progress.sent,
    failed: progress.failed
  });
  const hasNewUpdates =
    lastFetchedProgressRef.current.sent !== progress.sent ||
    lastFetchedProgressRef.current.failed !== progress.failed;

  const handleRefresh = () => {
    lastFetchedProgressRef.current = {
      sent: progress.sent,
      failed: progress.failed
    };
    fetchRecipients(filter, 0, false);
  };

  const handleFilterChange = (newFilter: FilterStatus) => {
    lastFetchedProgressRef.current = {
      sent: progress.sent,
      failed: progress.failed
    };
    if (newFilter === filter) return;
    setFilter(newFilter);
    setSearchQuery('');
    fetchRecipients(newFilter, 0, false);
  };

  const handleLoadMore = () => {
    fetchRecipients(filter, recipients.length, true);
  };

  const filteredBySearch = searchQuery
    ? recipients.filter(r =>
        r.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recipients;

  const statusConfig = {
    sent: {
      label: 'Sent',
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200'
    },
    sending: {
      label: 'Sending',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200'
    },
    pending: {
      label: 'Pending',
      color: 'text-gray-500',
      bg: 'bg-gray-50',
      border: 'border-gray-200'
    },
    failed: {
      label: 'Failed',
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200'
    }
  };

  const hasMore = recipients.length < total;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Recipients</h3>
          <div className="flex items-center gap-2">
            {hasNewUpdates && (
              <button
                onClick={handleRefresh}
                disabled={loading}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100',
                  loading && 'cursor-not-allowed opacity-50'
                )}
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                New updates
              </button>
            )}
            <span className="text-sm text-slate-500">
              {progress.total} total
            </span>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => handleFilterChange('all')}
            disabled={loading}
            className={cn(
              'cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'all'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              loading && 'cursor-not-allowed opacity-50'
            )}
          >
            All ({progress.total})
          </button>
          <button
            onClick={() => handleFilterChange('sent')}
            disabled={loading}
            className={cn(
              'cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'sent'
                ? 'bg-green-600 text-white'
                : 'bg-green-50 text-green-700 hover:bg-green-100',
              loading && 'cursor-not-allowed opacity-50'
            )}
          >
            Sent ({progress.sent})
          </button>
          <button
            onClick={() => handleFilterChange('pending')}
            disabled={loading}
            className={cn(
              'cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'pending'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              loading && 'cursor-not-allowed opacity-50'
            )}
          >
            Pending ({progress.pending})
          </button>
          {progress.failed > 0 && (
            <button
              onClick={() => handleFilterChange('failed')}
              disabled={loading}
              className={cn(
                'cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                filter === 'failed'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100',
                loading && 'cursor-not-allowed opacity-50'
              )}
            >
              Failed ({progress.failed})
            </button>
          )}
        </div>

        <input
          type="text"
          placeholder="Search loaded emails..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-slate-500 focus:outline-none"
        />
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading && recipients.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            Loading...
          </div>
        ) : filteredBySearch.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            {searchQuery ? 'No matching emails found' : 'No recipients'}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredBySearch.map(recipient => {
              const config = statusConfig[recipient.status];
              return (
                <li
                  key={recipient.id}
                  className="px-4 py-2.5 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex-1 truncate text-sm text-slate-700">
                      {recipient.email}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-xs',
                        config.bg,
                        config.color,
                        config.border,
                        'border'
                      )}
                    >
                      {config.label}
                    </span>
                  </div>
                  {recipient.status === 'failed' && recipient.error_message && (
                    <p className="mt-1 truncate text-xs text-red-500">
                      {recipient.error_message}
                    </p>
                  )}
                  {recipient.status === 'sent' && recipient.sent_at && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(recipient.sent_at).toLocaleString()}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {hasMore && !searchQuery && (
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className={cn(
              'w-full cursor-pointer rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600',
              'transition-colors hover:bg-slate-200',
              loading && 'cursor-not-allowed opacity-50'
            )}
          >
            {loading
              ? 'Loading...'
              : `Load more (${recipients.length} of ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
