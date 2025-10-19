'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { BatchSendResponse, EmailResult } from '@/types/email';

export default function EmailComposer() {
  const { data: session } = useSession();
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [recipients, setRecipients] = useState('');
  const [recipientList, setRecipientList] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sentEmails, setSentEmails] = useState<string[]>([]);
  const [failedEmails, setFailedEmails] = useState<Array<{ email: string; error: string }>>([]);
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
        .map((r: EmailResult) => ({ email: r.email, error: r.error || 'Unknown error' }));

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
    progress.total > 0 ? ((progress.sent + progress.failed) / progress.total) * 100 : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Email subject"
            disabled={isRunning}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email Body (HTML supported - images, signatures, etc.)
          </label>
          <textarea
            value={htmlBody}
            onChange={e => setHtmlBody(e.target.value)}
            rows={12}
            placeholder="<p>Hello!</p><img src='https://example.com/signature.png' />"
            disabled={isRunning}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition font-mono text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Recipients (one email per line)
          </label>
          <textarea
            value={recipients}
            onChange={e => setRecipients(e.target.value)}
            rows={6}
            placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
            disabled={isRunning}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={parseRecipients}
            disabled={isRunning}
            className="mt-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Load Recipients (
            {recipientList.length > 0 ? `${recipientList.length} loaded` : '0 loaded'})
          </button>
        </div>
      </div>

      {progress.total > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Campaign Progress</h3>
            {isRunning && (
              <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                {currentBatchSending ? <>Sending batch...</> : <>Next batch in {nextBatchIn}s</>}
              </div>
            )}
            {!isRunning && progress.sent + progress.failed === progress.total && (
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                Completed
              </div>
            )}
            {!isRunning &&
              progress.sent + progress.failed < progress.total &&
              progress.sent > 0 && (
                <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                  Paused
                </div>
              )}
          </div>

          <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center font-bold text-sm text-gray-900">
              {Math.round(progressPercent)}%
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 text-center">
              <div className="text-xs text-gray-600 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{progress.total}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-green-500 text-center">
              <div className="text-xs text-gray-600 mb-1">Sent</div>
              <div className="text-2xl font-bold text-gray-900">{progress.sent}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-red-500 text-center">
              <div className="text-xs text-gray-600 mb-1">Failed</div>
              <div className="text-2xl font-bold text-gray-900">{progress.failed}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-yellow-500 text-center">
              <div className="text-xs text-gray-600 mb-1">Remaining</div>
              <div className="text-2xl font-bold text-gray-900">
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
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Start Campaign (Sends 1 email every minute)
          </button>
        ) : (
          <button
            onClick={stopCampaign}
            className="w-full px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-lg transition"
          >
            Stop Campaign
          </button>
        )}
      </div>

      {sentEmails.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            Recently Sent ({sentEmails.length})
          </h3>
          <div className="max-h-72 overflow-y-auto p-4 bg-green-50 rounded-lg border-2 border-green-200">
            {sentEmails
              .slice(-10)
              .reverse()
              .map((email, i) => (
                <div key={i} className="flex items-center gap-3 p-2 mb-2 bg-white rounded">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-gray-700">{email}</span>
                </div>
              ))}
            {sentEmails.length > 10 && (
              <div className="text-center text-sm text-gray-600 italic mt-2">
                ...and {sentEmails.length - 10} more
              </div>
            )}
          </div>
        </div>
      )}

      {failedEmails.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Failed ({failedEmails.length})</h3>
          <div className="max-h-72 overflow-y-auto p-4 bg-red-50 rounded-lg border-2 border-red-200">
            {failedEmails.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-2 mb-2 bg-white rounded">
                <span className="text-red-600 font-bold">✗</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">{item.email}</div>
                  <div className="text-xs text-red-600 mt-1">{item.error}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
