'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface RecipientsListProps {
  validEmails: string[];
  invalidEmails?: { email: string; reason: string }[];
  duplicates?: string[];
  onClear: () => void;
  onRemoveEmail?: (email: string) => void;
  disabled?: boolean;
}

export default function RecipientsList({
  validEmails,
  invalidEmails = [],
  duplicates = [],
  onClear,
  onRemoveEmail,
  disabled
}: RecipientsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'valid' | 'invalid' | 'duplicates'
  >('valid');

  const hasInvalid = invalidEmails.length > 0;
  const hasDuplicates = duplicates.length > 0;

  return (
    <div className="mt-3 overflow-hidden rounded-lg border">
      <div
        className="flex cursor-pointer items-center justify-between bg-green-50 p-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-green-700">
            {validEmails.length} recipients loaded
          </span>
          {hasInvalid && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
              {invalidEmails.length} invalid
            </span>
          )}
          {hasDuplicates && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
              {duplicates.length} duplicates
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => {
              e.stopPropagation();
              onClear();
            }}
            disabled={disabled}
            className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Clear
          </button>
          <svg
            className={cn(
              'h-5 w-5 text-gray-500 transition-transform',
              isExpanded && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t">
          <div className="flex border-b bg-gray-50">
            <button
              onClick={() => setActiveTab('valid')}
              className={cn(
                'flex-1 cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === 'valid'
                  ? 'border-b-2 border-green-500 bg-white text-green-700'
                  : 'text-gray-600 hover:text-gray-800'
              )}
            >
              Valid ({validEmails.length})
            </button>
            {hasInvalid && (
              <button
                onClick={() => setActiveTab('invalid')}
                className={cn(
                  'flex-1 cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors',
                  activeTab === 'invalid'
                    ? 'border-b-2 border-red-500 bg-white text-red-700'
                    : 'text-gray-600 hover:text-gray-800'
                )}
              >
                Invalid ({invalidEmails.length})
              </button>
            )}
            {hasDuplicates && (
              <button
                onClick={() => setActiveTab('duplicates')}
                className={cn(
                  'flex-1 cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors',
                  activeTab === 'duplicates'
                    ? 'border-b-2 border-yellow-500 bg-white text-yellow-700'
                    : 'text-gray-600 hover:text-gray-800'
                )}
              >
                Duplicates ({duplicates.length})
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto p-2 sm:max-h-96">
            {activeTab === 'valid' && (
              <ul className="space-y-0.5">
                {validEmails.map((email, idx) => (
                  <li
                    key={idx}
                    className="group flex items-center justify-between rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <span className="truncate">{email}</span>
                    {onRemoveEmail && !disabled && (
                      <button
                        onClick={() => onRemoveEmail(email)}
                        className="ml-2 shrink-0 cursor-pointer rounded p-1.5 text-gray-400 transition-opacity hover:bg-red-50 hover:text-red-500 active:bg-red-100 lg:opacity-0 lg:group-hover:opacity-100"
                        title="Remove email"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {activeTab === 'invalid' && (
              <ul className="space-y-0.5">
                {invalidEmails.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-50"
                  >
                    <span className="truncate text-gray-700">{item.email}</span>
                    <span className="ml-2 text-xs whitespace-nowrap text-red-500">
                      {item.reason}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {activeTab === 'duplicates' && (
              <ul className="space-y-0.5">
                {duplicates.map((email, idx) => (
                  <li
                    key={idx}
                    className="rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {email}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
