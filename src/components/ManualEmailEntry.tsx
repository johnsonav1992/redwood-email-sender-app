'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { validateEmail } from '@/lib/email-parser';

interface ManualEmailEntryProps {
  onAddEmail: (email: string) => boolean;
  disabled?: boolean;
  existingEmails: string[];
}

export default function ManualEmailEntry({
  onAddEmail,
  disabled,
  existingEmails
}: ManualEmailEntryProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Please enter an email');
      return;
    }

    const validation = validateEmail(trimmedEmail);
    if (!validation.valid) {
      setError(validation.error || 'Invalid email format');
      return;
    }

    if (existingEmails.some(e => e.toLowerCase() === trimmedEmail)) {
      setError('Email already in list');
      return;
    }

    const success = onAddEmail(trimmedEmail);
    if (success) {
      setEmail('');
      setError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter an email address manually"
          disabled={disabled}
          className={cn(
            'flex-1 rounded-lg border px-3 py-2 text-sm transition',
            'focus:border-slate-400 focus:outline-none',
            'disabled:cursor-not-allowed disabled:bg-gray-50',
            error ? 'border-red-300' : 'border-gray-200'
          )}
        />
        <button
          onClick={handleAdd}
          disabled={disabled || !email.trim()}
          className={cn(
            'cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            'bg-slate-600 text-white hover:bg-slate-700 active:bg-slate-800',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          Add
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
