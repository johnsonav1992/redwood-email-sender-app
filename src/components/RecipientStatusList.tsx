'use client';

import { useState, useCallback } from 'react';
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
  progress,
}: RecipientStatusListProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRecipients = useCallback(async (
    status: FilterStatus,
    offset: number = 0,
    append: boolean = false
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status,
        limit: '50',
        offset: offset.toString(),
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
  }, [campaignId]);

  const handleFilterChange = (newFilter: FilterStatus) => {
    if (newFilter === filter) return;
    setFilter(newFilter);
    setSearchQuery('');
    fetchRecipients(newFilter, 0, false);
  };

  const handleLoadMore = () => {
    fetchRecipients(filter, recipients.length, true);
  };

  const filteredBySearch = searchQuery
    ? recipients.filter(r => r.email.toLowerCase().includes(searchQuery.toLowerCase()))
    : recipients;

  const statusConfig = {
    sent: { label: 'Sent', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    sending: { label: 'Sending', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    pending: { label: 'Pending', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
    failed: { label: 'Failed', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  };

  const hasMore = recipients.length < total;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">Recipients</h3>
          <span className="text-sm text-slate-500">{progress.total} total</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => handleFilterChange('all')}
            disabled={loading}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
              filter === 'all'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            All ({progress.total})
          </button>
          <button
            onClick={() => handleFilterChange('sent')}
            disabled={loading}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
              filter === 'sent'
                ? 'bg-green-600 text-white'
                : 'bg-green-50 text-green-700 hover:bg-green-100',
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            Sent ({progress.sent})
          </button>
          <button
            onClick={() => handleFilterChange('pending')}
            disabled={loading}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
              filter === 'pending'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            Pending ({progress.pending})
          </button>
          {progress.failed > 0 && (
            <button
              onClick={() => handleFilterChange('failed')}
              disabled={loading}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                filter === 'failed'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100',
                loading && 'opacity-50 cursor-not-allowed'
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
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
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
            {filteredBySearch.map((recipient) => {
              const config = statusConfig[recipient.status];
              return (
                <li key={recipient.id} className="px-4 py-2.5 hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-700 truncate flex-1">
                      {recipient.email}
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full shrink-0',
                      config.bg,
                      config.color,
                      config.border,
                      'border'
                    )}>
                      {config.label}
                    </span>
                  </div>
                  {recipient.status === 'failed' && recipient.error_message && (
                    <p className="text-xs text-red-500 mt-1 truncate">
                      {recipient.error_message}
                    </p>
                  )}
                  {recipient.status === 'sent' && recipient.sent_at && (
                    <p className="text-xs text-slate-400 mt-0.5">
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
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className={cn(
              'w-full py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg',
              'hover:bg-slate-200 transition-colors',
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {loading ? 'Loading...' : `Load more (${recipients.length} of ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
