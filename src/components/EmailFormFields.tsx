'use client';

import { cn } from '@/lib/utils';

interface EmailFormFieldsProps {
  subject: string;
  htmlBody: string;
  recipients: string;
  recipientList: string[];
  isRunning: boolean;
  onSubjectChange: (value: string) => void;
  onHtmlBodyChange: (value: string) => void;
  onRecipientsChange: (value: string) => void;
  onLoadRecipients: () => void;
}

export default function EmailFormFields({
  subject,
  htmlBody,
  recipients,
  recipientList,
  isRunning,
  onSubjectChange,
  onHtmlBodyChange,
  onRecipientsChange,
  onLoadRecipients
}: EmailFormFieldsProps) {
  return (
    <div className={cn('space-y-4')}>
      <div>
        <label
          className={cn(
            'mb-2',
            'block',
            'text-sm',
            'font-semibold',
            'text-gray-700'
          )}
        >
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={e => onSubjectChange(e.target.value)}
          placeholder="Email subject"
          disabled={isRunning}
          className={cn(
            'w-full',
            'rounded-lg',
            'border-2',
            'border-gray-200',
            'px-4',
            'py-2',
            'transition',
            'focus:border-slate-400',
            'focus:outline-none',
            'disabled:cursor-not-allowed',
            'disabled:bg-gray-50'
          )}
        />
      </div>

      <div>
        <label
          className={cn(
            'mb-2',
            'block',
            'text-sm',
            'font-semibold',
            'text-gray-700'
          )}
        >
          Email Body (HTML supported - images, signatures, etc.)
        </label>
        <textarea
          value={htmlBody}
          onChange={e => onHtmlBodyChange(e.target.value)}
          rows={12}
          placeholder="<p>Hello!</p><img src='https://example.com/signature.png' />"
          disabled={isRunning}
          className={cn(
            'w-full',
            'rounded-lg',
            'border-2',
            'border-gray-200',
            'px-4',
            'py-2',
            'font-mono',
            'text-sm',
            'transition',
            'focus:border-slate-400',
            'focus:outline-none',
            'disabled:cursor-not-allowed',
            'disabled:bg-gray-50'
          )}
        />
      </div>

      <div>
        <label
          className={cn(
            'mb-2',
            'block',
            'text-sm',
            'font-semibold',
            'text-gray-700'
          )}
        >
          Recipients (one email per line)
        </label>
        <textarea
          value={recipients}
          onChange={e => onRecipientsChange(e.target.value)}
          rows={6}
          placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
          disabled={isRunning}
          className={cn(
            'w-full',
            'rounded-lg',
            'border-2',
            'border-gray-200',
            'px-4',
            'py-2',
            'transition',
            'focus:border-slate-400',
            'focus:outline-none',
            'disabled:cursor-not-allowed',
            'disabled:bg-gray-50'
          )}
        />
        <button
          onClick={onLoadRecipients}
          disabled={isRunning}
          className={cn(
            'mt-2',
            'rounded-lg',
            'bg-gray-100',
            'px-4',
            'py-2',
            'font-semibold',
            'text-gray-800',
            'transition',
            'hover:bg-gray-200',
            'disabled:cursor-not-allowed',
            'disabled:opacity-50'
          )}
        >
          Load Recipients (
          {recipientList.length > 0
            ? `${recipientList.length} loaded`
            : '0 loaded'}
          )
        </button>
      </div>
    </div>
  );
}
