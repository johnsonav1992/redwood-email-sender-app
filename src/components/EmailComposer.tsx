'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { BatchSendResponse, EmailResult } from '@/types/email';
import { cn } from '@/lib/utils';

export default function EmailComposer() {
  const { data: session } = useSession();
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [recipients, setRecipients] = useState('');
  const [recipientList, setRecipientList] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sentEmails, setSentEmails] = useState<string[]>([]);
  const [failedEmails, setFailedEmails] = useState<
    Array<{ email: string; error: string }>
  >([]);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [nextBatchIn, setNextBatchIn] = useState<number | null>(null);
  const [currentBatchSending, setCurrentBatchSending] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const parseRecipients = () => {
    const emails = recipients
      .split('\n')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    setRecipientList(emails);
    setProgress({ sent: 0, failed: 0, total: emails.length });
    setSentEmails([]);
    setFailedEmails([]);
  };

  const sendNextBatch = async () => {
    if (recipientList.length === 0) {
      stopCampaign();
      return;
    }

    setCurrentBatchSending(true);

    try {
      const response = await fetch('/api/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipientList,
          subject,
          htmlBody,
          batchSize: 1
        })
      });

      const data = (await response.json()) as BatchSendResponse;

      if (!response.ok) {
        console.error('Batch send error:', data);
        setCurrentBatchSending(false);
        return;
      }

      const newSent = data.results
        .filter((r: EmailResult) => r.status === 'sent')
        .map((r: EmailResult) => r.email);

      const newFailed = data.results
        .filter((r: EmailResult) => r.status === 'failed')
        .map((r: EmailResult) => ({
          email: r.email,
          error: r.error || 'Unknown error'
        }));

      setSentEmails(prev => [...prev, ...newSent]);
      setFailedEmails(prev => [...prev, ...newFailed]);

      const remaining = recipientList.slice(data.batchSize);
      setRecipientList(remaining);

      setProgress(prev => ({
        sent: prev.sent + data.sent,
        failed: prev.failed + data.failed,
        total: prev.total
      }));

      setCurrentBatchSending(false);

      if (remaining.length === 0) {
        stopCampaign();
        alert('All emails sent!');
      }
    } catch (error) {
      console.error('Error:', error);
      setCurrentBatchSending(false);
    }
  };

  const startCampaign = () => {
    if (!subject || !htmlBody || recipientList.length === 0) {
      alert('Please fill in subject, body, and load recipients first');
      return;
    }

    setIsRunning(true);
    sendNextBatch();

    intervalRef.current = setInterval(() => {
      sendNextBatch();
    }, 60000);

    startCountdown();
  };

  const startCountdown = () => {
    setNextBatchIn(60);
    countdownRef.current = setInterval(() => {
      setNextBatchIn(prev => {
        if (prev === null || prev <= 1) {
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCampaign = () => {
    setIsRunning(false);
    setNextBatchIn(null);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  if (!session) {
    return null;
  }

  const progressPercent =
    progress.total > 0
      ? ((progress.sent + progress.failed) / progress.total) * 100
      : 0;

  return (
    <div
      className={cn('space-y-6', 'rounded-xl', 'bg-white', 'p-8', 'shadow-sm')}
    >
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
            onChange={e => setSubject(e.target.value)}
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
              'focus:border-blue-500',
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
            onChange={e => setHtmlBody(e.target.value)}
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
              'focus:border-blue-500',
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
            onChange={e => setRecipients(e.target.value)}
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
              'focus:border-blue-500',
              'focus:outline-none',
              'disabled:cursor-not-allowed',
              'disabled:bg-gray-50'
            )}
          />
          <button
            onClick={parseRecipients}
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

      {progress.total > 0 && (
        <div
          className={cn(
            'rounded-lg',
            'border-2',
            'border-gray-200',
            'bg-gray-50',
            'p-6'
          )}
        >
          <div
            className={cn('mb-4', 'flex', 'items-center', 'justify-between')}
          >
            <h3 className={cn('text-lg', 'font-bold', 'text-gray-900')}>
              Campaign Progress
            </h3>
            {isRunning && (
              <div
                className={cn(
                  'rounded-full',
                  'bg-blue-100',
                  'px-4',
                  'py-2',
                  'text-sm',
                  'font-semibold',
                  'text-blue-800'
                )}
              >
                {currentBatchSending ? (
                  <>Sending batch...</>
                ) : (
                  <>Next batch in {nextBatchIn}s</>
                )}
              </div>
            )}
            {!isRunning &&
              progress.sent + progress.failed === progress.total && (
                <div
                  className={cn(
                    'rounded-full',
                    'bg-green-100',
                    'px-4',
                    'py-2',
                    'text-sm',
                    'font-semibold',
                    'text-green-800'
                  )}
                >
                  Completed
                </div>
              )}
            {!isRunning &&
              progress.sent + progress.failed < progress.total &&
              progress.sent > 0 && (
                <div
                  className={cn(
                    'rounded-full',
                    'bg-yellow-100',
                    'px-4',
                    'py-2',
                    'text-sm',
                    'font-semibold',
                    'text-yellow-800'
                  )}
                >
                  Paused
                </div>
              )}
          </div>

          <div
            className={cn(
              'relative',
              'mb-4',
              'h-8',
              'overflow-hidden',
              'rounded-full',
              'bg-gray-200'
            )}
          >
            <div
              className={cn(
                'h-full',
                'bg-gradient-to-r',
                'from-green-500',
                'to-blue-500',
                'transition-all',
                'duration-500'
              )}
              style={{ width: `${progressPercent}%` }}
            />
            <span
              className={cn(
                'absolute',
                'inset-0',
                'flex',
                'items-center',
                'justify-center',
                'text-sm',
                'font-bold',
                'text-gray-900'
              )}
            >
              {Math.round(progressPercent)}%
            </span>
          </div>

          <div className={cn('grid', 'grid-cols-4', 'gap-4')}>
            <div
              className={cn(
                'rounded-lg',
                'border-2',
                'border-gray-200',
                'bg-white',
                'p-4',
                'text-center'
              )}
            >
              <div className={cn('mb-1', 'text-xs', 'text-gray-600')}>
                Total
              </div>
              <div className={cn('text-2xl', 'font-bold', 'text-gray-900')}>
                {progress.total}
              </div>
            </div>
            <div
              className={cn(
                'rounded-lg',
                'border-2',
                'border-green-500',
                'bg-white',
                'p-4',
                'text-center'
              )}
            >
              <div className={cn('mb-1', 'text-xs', 'text-gray-600')}>Sent</div>
              <div className={cn('text-2xl', 'font-bold', 'text-gray-900')}>
                {progress.sent}
              </div>
            </div>
            <div
              className={cn(
                'rounded-lg',
                'border-2',
                'border-red-500',
                'bg-white',
                'p-4',
                'text-center'
              )}
            >
              <div className={cn('mb-1', 'text-xs', 'text-gray-600')}>
                Failed
              </div>
              <div className={cn('text-2xl', 'font-bold', 'text-gray-900')}>
                {progress.failed}
              </div>
            </div>
            <div
              className={cn(
                'rounded-lg',
                'border-2',
                'border-yellow-500',
                'bg-white',
                'p-4',
                'text-center'
              )}
            >
              <div className={cn('mb-1', 'text-xs', 'text-gray-600')}>
                Remaining
              </div>
              <div className={cn('text-2xl', 'font-bold', 'text-gray-900')}>
                {progress.total - progress.sent - progress.failed}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        {!isRunning ? (
          <button
            onClick={startCampaign}
            disabled={recipientList.length === 0 || !subject || !htmlBody}
            className={cn(
              'w-full',
              'rounded-lg',
              'bg-blue-600',
              'px-6',
              'py-4',
              'text-lg',
              'font-bold',
              'text-white',
              'transition',
              'hover:bg-blue-700',
              'disabled:cursor-not-allowed',
              'disabled:bg-gray-300'
            )}
          >
            Start Campaign (Sends 1 email every minute)
          </button>
        ) : (
          <button
            onClick={stopCampaign}
            className={cn(
              'w-full',
              'rounded-lg',
              'bg-red-600',
              'px-6',
              'py-4',
              'text-lg',
              'font-bold',
              'text-white',
              'transition',
              'hover:bg-red-700'
            )}
          >
            Stop Campaign
          </button>
        )}
      </div>

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
    </div>
  );
}
