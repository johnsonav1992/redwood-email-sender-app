import { useState } from 'react';
import type { BatchSendResponse, EmailResult, FailedEmail, Progress } from '@/types/email';

export function useEmailSending(onBatchSent?: () => void) {
  const [sentEmails, setSentEmails] = useState<string[]>([]);
  const [failedEmails, setFailedEmails] = useState<FailedEmail[]>([]);
  const [progress, setProgress] = useState<Progress>({
    sent: 0,
    failed: 0,
    total: 0
  });
  const [currentBatchSending, setCurrentBatchSending] = useState(false);

  const resetProgress = (total: number) => {
    setProgress({ sent: 0, failed: 0, total });
    setSentEmails([]);
    setFailedEmails([]);
  };

  const sendBatch = async (
    recipientList: string[],
    subject: string,
    htmlBody: string,
    batchSize: number = 1
  ): Promise<{ success: boolean; remaining: string[] }> => {
    if (recipientList.length === 0) {
      return { success: true, remaining: [] };
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
          batchSize
        })
      });

      const data = (await response.json()) as BatchSendResponse;

      if (!response.ok) {
        console.error('Batch send error:', data);
        setCurrentBatchSending(false);
        return { success: false, remaining: recipientList };
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

      setProgress(prev => ({
        sent: prev.sent + data.sent,
        failed: prev.failed + data.failed,
        total: prev.total
      }));

      setCurrentBatchSending(false);

      if (data.sent > 0 && onBatchSent) {
        onBatchSent();
      }

      return { success: true, remaining };
    } catch (error) {
      console.error('Error:', error);
      setCurrentBatchSending(false);
      return { success: false, remaining: recipientList };
    }
  };

  return {
    sentEmails,
    failedEmails,
    progress,
    currentBatchSending,
    resetProgress,
    sendBatch
  };
}
