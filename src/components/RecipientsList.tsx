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
  disabled,
}: RecipientsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'valid' | 'invalid' | 'duplicates'>('valid');

  const hasInvalid = invalidEmails.length > 0;
  const hasDuplicates = duplicates.length > 0;

  return (
    <div className="mt-3 border rounded-lg overflow-hidden">
      <div
        className="p-3 bg-green-50 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-green-700 font-medium">
            {validEmails.length} recipients loaded
          </span>
          {hasInvalid && (
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
              {invalidEmails.length} invalid
            </span>
          )}
          {hasDuplicates && (
            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
              {duplicates.length} duplicates
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            disabled={disabled}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 cursor-pointer"
          >
            Clear
          </button>
          <svg
            className={cn('w-5 h-5 text-gray-500 transition-transform', isExpanded && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t">
          <div className="flex border-b bg-gray-50">
            <button
              onClick={() => setActiveTab('valid')}
              className={cn(
                'flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer',
                activeTab === 'valid'
                  ? 'bg-white border-b-2 border-green-500 text-green-700'
                  : 'text-gray-600 hover:text-gray-800'
              )}
            >
              Valid ({validEmails.length})
            </button>
            {hasInvalid && (
              <button
                onClick={() => setActiveTab('invalid')}
                className={cn(
                  'flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer',
                  activeTab === 'invalid'
                    ? 'bg-white border-b-2 border-red-500 text-red-700'
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
                  'flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer',
                  activeTab === 'duplicates'
                    ? 'bg-white border-b-2 border-yellow-500 text-yellow-700'
                    : 'text-gray-600 hover:text-gray-800'
                )}
              >
                Duplicates ({duplicates.length})
              </button>
            )}
          </div>
          <div className="max-h-80 sm:max-h-96 overflow-y-auto p-2">
            {activeTab === 'valid' && (
              <ul className="space-y-0.5">
                {validEmails.map((email, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-gray-700 px-2 py-1.5 hover:bg-gray-50 rounded flex items-center justify-between group"
                  >
                    <span className="truncate">{email}</span>
                    {onRemoveEmail && !disabled && (
                      <button
                        onClick={() => onRemoveEmail(email)}
                        className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded cursor-pointer shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                        title="Remove email"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                  <li key={idx} className="text-sm px-2 py-1.5 hover:bg-gray-50 rounded flex justify-between">
                    <span className="text-gray-700 truncate">{item.email}</span>
                    <span className="text-red-500 text-xs ml-2 whitespace-nowrap">{item.reason}</span>
                  </li>
                ))}
              </ul>
            )}
            {activeTab === 'duplicates' && (
              <ul className="space-y-0.5">
                {duplicates.map((email, idx) => (
                  <li key={idx} className="text-sm text-gray-700 px-2 py-1.5 hover:bg-gray-50 rounded">
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
