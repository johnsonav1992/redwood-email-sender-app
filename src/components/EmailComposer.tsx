'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useCampaign } from '@/hooks/useCampaign';
import { useEmailSending } from '@/hooks/useEmailSending';
import EmailFormFields from './EmailFormFields';
import CampaignProgress from './CampaignProgress';
import CampaignControls from './CampaignControls';
import EmailResults from './EmailResults';

interface EmailComposerProps {
  onBatchSent?: () => void;
}

export default function EmailComposer({ onBatchSent }: EmailComposerProps) {
  const { data: session } = useSession();
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [recipients, setRecipients] = useState('');
  const [recipientList, setRecipientList] = useState<string[]>([]);

  const {
    sentEmails,
    failedEmails,
    progress,
    currentBatchSending,
    resetProgress,
    sendBatch
  } = useEmailSending(onBatchSent);

  const handleSendBatch = async (): Promise<boolean> => {
    if (recipientList.length === 0) {
      alert('All emails sent!');
      return false;
    }

    const result = await sendBatch(recipientList, subject, htmlBody, 1);

    if (result.success) {
      setRecipientList(result.remaining);
      return result.remaining.length > 0;
    }

    return false;
  };

  const { isRunning, nextBatchIn, startCampaign, stopCampaign } = useCampaign({
    onSendBatch: handleSendBatch
  });

  const parseRecipients = () => {
    const emails = recipients
      .split('\n')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    setRecipientList(emails);
    resetProgress(emails.length);
  };

  const handleStartCampaign = () => {
    if (!subject || !htmlBody || recipientList.length === 0) {
      alert('Please fill in subject, body, and load recipients first');
      return;
    }

    startCampaign();
  };

  if (!session) {
    return null;
  }

  return (
    <div
      className={cn('space-y-6', 'rounded-xl', 'bg-white', 'p-8', 'shadow-sm')}
    >
      <EmailFormFields
        subject={subject}
        htmlBody={htmlBody}
        recipients={recipients}
        recipientList={recipientList}
        isRunning={isRunning}
        onSubjectChange={setSubject}
        onHtmlBodyChange={setHtmlBody}
        onRecipientsChange={setRecipients}
        onLoadRecipients={parseRecipients}
      />
      <CampaignProgress
        progress={progress}
        isRunning={isRunning}
        currentBatchSending={currentBatchSending}
        nextBatchIn={nextBatchIn}
      />
      <CampaignControls
        isRunning={isRunning}
        recipientList={recipientList}
        subject={subject}
        htmlBody={htmlBody}
        onStart={handleStartCampaign}
        onStop={stopCampaign}
      />
      <EmailResults sentEmails={sentEmails} failedEmails={failedEmails} />
    </div>
  );
}
