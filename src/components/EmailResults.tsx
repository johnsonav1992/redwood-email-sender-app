'use client';

import { cn } from '@/lib/utils';
import type { FailedEmail } from '@/types/email';

interface EmailResultsProps {
  sentEmails: string[];
  failedEmails: FailedEmail[];
}

export default function EmailResults({
  sentEmails,
  failedEmails
}: EmailResultsProps) {
  return (
    <>
      {sentEmails.length > 0 && (
        <div>
          <h3 className={cn('mb-3', 'text-lg', 'font-bold', 'text-gray-900')}>
            Recently Sent ({sentEmails.length})
          </h3>
          <div
            className={cn(
              'max-h-72',
              'overflow-y-auto',
              'rounded-lg',
              'border-2',
              'border-green-200',
              'bg-green-50',
              'p-4'
            )}
          >
            {sentEmails
              .slice(-10)
              .reverse()
              .map((email, i) => (
                <div
                  key={i}
                  className={cn(
                    'mb-2',
                    'flex',
                    'items-center',
                    'gap-3',
                    'rounded',
                    'bg-white',
                    'p-2'
                  )}
                >
                  <span className={cn('font-bold', 'text-green-600')}>✓</span>
                  <span className={cn('text-sm', 'text-gray-700')}>
                    {email}
                  </span>
                </div>
              ))}
            {sentEmails.length > 10 && (
              <div
                className={cn(
                  'mt-2',
                  'text-center',
                  'text-sm',
                  'text-gray-600',
                  'italic'
                )}
              >
                ...and {sentEmails.length - 10} more
              </div>
            )}
          </div>
        </div>
      )}

      {failedEmails.length > 0 && (
        <div>
          <h3 className={cn('mb-3', 'text-lg', 'font-bold', 'text-gray-900')}>
            Failed ({failedEmails.length})
          </h3>
          <div
            className={cn(
              'max-h-72',
              'overflow-y-auto',
              'rounded-lg',
              'border-2',
              'border-red-200',
              'bg-red-50',
              'p-4'
            )}
          >
            {failedEmails.map((item, i) => (
              <div
                key={i}
                className={cn(
                  'mb-2',
                  'flex',
                  'items-start',
                  'gap-3',
                  'rounded',
                  'bg-white',
                  'p-2'
                )}
              >
                <span className={cn('font-bold', 'text-red-600')}>✗</span>
                <div className={cn('flex-1')}>
                  <div
                    className={cn('text-sm', 'font-semibold', 'text-gray-900')}
                  >
                    {item.email}
                  </div>
                  <div className={cn('mt-1', 'text-xs', 'text-red-600')}>
                    {item.error}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
