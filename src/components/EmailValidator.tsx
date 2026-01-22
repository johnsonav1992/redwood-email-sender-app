'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ParsedEmailResult } from '@/types/campaign';

interface EmailValidatorProps {
  result: ParsedEmailResult;
  onConfirm: (emails: string[]) => void;
  onCancel: () => void;
}

export default function EmailValidator({
  result,
  onConfirm,
  onCancel
}: EmailValidatorProps) {
  const [showInvalid, setShowInvalid] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const handleConfirm = () => {
    onConfirm(result.valid);
  };

  return (
    <div className="space-y-4 rounded-lg bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Email Validation Results</h3>
        <button
          onClick={onCancel}
          className="cursor-pointer text-gray-400 hover:text-gray-600"
        >
          <svg
            className="h-5 w-5"
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
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-lg bg-green-50 p-3">
          <p className="text-2xl font-bold text-green-600">
            {result.valid.length}
          </p>
          <p className="text-sm text-green-700">Valid</p>
        </div>
        <div
          className={cn(
            'cursor-pointer rounded-lg p-3 transition-colors',
            result.invalid.length > 0
              ? 'bg-red-50 hover:bg-red-100'
              : 'bg-gray-100'
          )}
          onClick={() =>
            result.invalid.length > 0 && setShowInvalid(!showInvalid)
          }
        >
          <p
            className={cn(
              'text-2xl font-bold',
              result.invalid.length > 0 ? 'text-red-600' : 'text-gray-400'
            )}
          >
            {result.invalid.length}
          </p>
          <p
            className={cn(
              'text-sm',
              result.invalid.length > 0 ? 'text-red-700' : 'text-gray-500'
            )}
          >
            Invalid
          </p>
        </div>
        <div
          className={cn(
            'cursor-pointer rounded-lg p-3 transition-colors',
            result.duplicates.length > 0
              ? 'bg-yellow-50 hover:bg-yellow-100'
              : 'bg-gray-100'
          )}
          onClick={() =>
            result.duplicates.length > 0 && setShowDuplicates(!showDuplicates)
          }
        >
          <p
            className={cn(
              'text-2xl font-bold',
              result.duplicates.length > 0 ? 'text-yellow-600' : 'text-gray-400'
            )}
          >
            {result.duplicates.length}
          </p>
          <p
            className={cn(
              'text-sm',
              result.duplicates.length > 0 ? 'text-yellow-700' : 'text-gray-500'
            )}
          >
            Duplicates
          </p>
        </div>
      </div>
      {showInvalid && result.invalid.length > 0 && (
        <div className="mt-4 max-h-40 overflow-y-auto rounded border border-red-200 bg-white p-3">
          <p className="mb-2 text-sm font-medium text-red-700">
            Invalid Emails:
          </p>
          <ul className="space-y-1 text-sm text-gray-600">
            {result.invalid.map((item, idx) => (
              <li key={idx} className="flex justify-between">
                <span className="truncate">{item.email}</span>
                <span className="ml-2 text-xs text-red-500">{item.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {showDuplicates && result.duplicates.length > 0 && (
        <div className="mt-4 max-h-40 overflow-y-auto rounded border border-yellow-200 bg-white p-3">
          <p className="mb-2 text-sm font-medium text-yellow-700">
            Duplicate Emails (removed):
          </p>
          <ul className="space-y-1 text-sm text-gray-600">
            {result.duplicates.map((email, idx) => (
              <li key={idx} className="truncate">
                {email}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleConfirm}
          disabled={result.valid.length === 0}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 font-medium transition-colors',
            result.valid.length > 0
              ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700'
              : 'cursor-not-allowed bg-gray-200 text-gray-500'
          )}
        >
          Use {result.valid.length} Valid Emails
        </button>
        <button
          onClick={onCancel}
          className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
