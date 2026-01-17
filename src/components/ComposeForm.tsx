'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useCampaignStream } from '@/hooks/useCampaignStream';
import { useCampaignPersistence } from '@/hooks/useCampaignPersistence';
import FileUploader from './FileUploader';
import EmailValidator from './EmailValidator';
import RecipientsList from './RecipientsList';
import BatchSettings from './BatchSettings';
import SignatureEditor from './SignatureEditor';
import RichTextEditor from './RichTextEditor';
import CampaignProgress from './CampaignProgress';
import CampaignControls from './CampaignControls';
import type {
  ParsedEmailResult,
  CampaignWithProgress,
  CampaignStatus
} from '@/types/campaign';

interface ComposeFormProps {
  initialCampaigns?: CampaignWithProgress[];
}

export default function ComposeForm({ initialCampaigns }: ComposeFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [signature, setSignature] = useState('');
  const [recipientList, setRecipientList] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState(30);
  const [batchDelaySeconds, setBatchDelaySeconds] = useState(60);
  const [uploadResult, setUploadResult] = useState<ParsedEmailResult | null>(
    null
  );
  const [confirmedResult, setConfirmedResult] =
    useState<ParsedEmailResult | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const campaignIdRef = useRef<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const {
    campaigns,
    currentCampaign,
    loading: persistenceLoading,
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaignStatus,
    sendNextBatch
  } = useCampaignPersistence({ initialCampaigns });

  const handleStatusChange = useCallback(
    async (newStatus: CampaignStatus) => {
      const id = campaignIdRef.current;
      if (!id) return false;
      return await updateCampaignStatus(id, newStatus);
    },
    [updateCampaignStatus]
  );

  const handleSendBatch = useCallback(
    async (id: string) => {
      await sendNextBatch(id);
    },
    [sendNextBatch]
  );

  const {
    status,
    progress: streamProgress,
    isConnected,
    lastError,
    isRunning,
    isPaused,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    stopCampaign,
    setInitialStatus,
    setInitialProgress
  } = useCampaignStream({
    campaignId,
    batchDelaySeconds,
    onStatusChange: handleStatusChange,
    onSendBatch: handleSendBatch
  });

  useEffect(() => {
    if (!initialCampaigns) {
      fetchCampaigns();
    }
  }, [initialCampaigns, fetchCampaigns]);

  useEffect(() => {
    if (initialized) return;

    const editId = searchParams.get('edit');
    if (editId && campaigns.length > 0) {
      const campaign = campaigns.find(c => c.id === editId);
      if (campaign) {
        campaignIdRef.current = campaign.id;
        setCampaignId(campaign.id);
        setInitialStatus(campaign.status);
        setInitialProgress({
          total: campaign.total_recipients,
          sent: campaign.sent_count,
          failed: campaign.failed_count,
          pending: campaign.pending_count
        });
        setBatchSize(campaign.batch_size);
        setBatchDelaySeconds(campaign.batch_delay_seconds);
        setSubject(campaign.subject);
        setHtmlBody(campaign.body);
        setSignature(campaign.signature || '');
        fetchCampaign(campaign.id);
        setInitialized(true);
      }
    } else if (!editId) {
      setInitialized(true);
    }
  }, [
    searchParams,
    campaigns,
    fetchCampaign,
    setInitialStatus,
    setInitialProgress,
    initialized
  ]);

  const handleUploadComplete = (result: ParsedEmailResult) => {
    setUploadResult(result);
  };

  const handleConfirmEmails = (emails: string[]) => {
    setRecipientList(emails);
    setConfirmedResult(uploadResult);
    setUploadResult(null);
  };

  const handleCancelUpload = () => {
    setUploadResult(null);
  };

  const handleCreateAndStart = async () => {
    if (!subject || !htmlBody || recipientList.length === 0) {
      alert('Please fill in subject, body, and upload recipients');
      return;
    }

    const campaign = await createCampaign({
      name: subject.substring(0, 50),
      subject,
      htmlBody,
      signature: signature || undefined,
      batchSize,
      batchDelaySeconds,
      recipients: recipientList
    });

    if (campaign) {
      campaignIdRef.current = campaign.id;
      setCampaignId(campaign.id);
      setInitialStatus('draft');
      await fetchCampaign(campaign.id);
      startCampaign(campaign.id);
    }
  };

  const handleNewCampaign = () => {
    campaignIdRef.current = null;
    setCampaignId(null);
    setSubject('');
    setHtmlBody('');
    setSignature('');
    setRecipientList([]);
    setUploadResult(null);
    setConfirmedResult(null);
    setInitialStatus('draft');
    setInitialProgress({ total: 0, sent: 0, failed: 0, pending: 0 });
    router.push('/compose');
  };

  const handleClearRecipients = () => {
    setRecipientList([]);
    setConfirmedResult(null);
  };

  const handleSendTest = async () => {
    if (!subject.trim() || !htmlBody.trim()) return;

    setSendingTest(true);
    setTestSent(false);

    try {
      const fullBody = signature ? `${htmlBody}<br><br>${signature}` : htmlBody;
      const response = await fetch('/api/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, htmlBody: fullBody })
      });

      if (response.ok) {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 3000);
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
    } finally {
      setSendingTest(false);
    }
  };

  if (!session) {
    return null;
  }

  const progress =
    streamProgress.total > 0
      ? streamProgress
      : currentCampaign?.progress || {
          total: recipientList.length,
          sent: 0,
          failed: 0,
          pending: recipientList.length
        };
  const canStart =
    !campaignId &&
    subject.trim() !== '' &&
    htmlBody.trim() !== '' &&
    recipientList.length > 0;

  return (
    <div className={cn('space-y-6')}>
      <div className={cn('bg-white', 'rounded-xl', 'shadow-sm', 'p-6')}>
        {campaignId && (
          <div
            className={cn(
              'flex',
              'items-center',
              'justify-between',
              'mb-6',
              'pb-4',
              'border-b',
              'border-gray-200'
            )}
          >
            <div>
              <span className={cn('text-sm', 'text-gray-500')}>
                Editing campaign
              </span>
              <h3 className={cn('font-medium', 'text-gray-900')}>
                {subject || 'Untitled'}
              </h3>
            </div>
            <button
              onClick={handleNewCampaign}
              className={cn(
                'px-4',
                'py-2',
                'text-sm',
                'font-medium',
                'text-blue-600',
                'hover:text-blue-700',
                'hover:bg-blue-50',
                'rounded-lg',
                'transition-colors',
                'cursor-pointer'
              )}
            >
              + Start New Campaign
            </button>
          </div>
        )}
        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject"
              disabled={isRunning || isPaused}
              className={cn(
                'w-full rounded-lg border-2 border-gray-200 px-4 py-2 transition',
                'focus:border-blue-500 focus:outline-none',
                'disabled:cursor-not-allowed disabled:bg-gray-50'
              )}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Email Body
            </label>
            <RichTextEditor
              value={htmlBody}
              onChange={setHtmlBody}
              disabled={isRunning || isPaused}
              placeholder="Write your email content..."
            />
          </div>

          <SignatureEditor
            signature={signature}
            onSignatureChange={setSignature}
            disabled={isRunning || isPaused}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={handleSendTest}
              disabled={!subject.trim() || !htmlBody.trim() || sendingTest}
              className={cn(
                'px-3 py-1.5 text-sm rounded border transition-colors cursor-pointer',
                'border-gray-300 text-gray-600 hover:bg-gray-50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {sendingTest ? 'Sending...' : 'Send Test Email'}
            </button>
            {testSent && (
              <span className="text-sm text-green-600">Sent to {session?.user?.email}</span>
            )}
          </div>

          <div className="border-t pt-6">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Recipients
            </label>
            {uploadResult ? (
              <EmailValidator
                result={uploadResult}
                onConfirm={handleConfirmEmails}
                onCancel={handleCancelUpload}
              />
            ) : (
              <>
                {recipientList.length === 0 ? (
                  <FileUploader
                    onUploadComplete={handleUploadComplete}
                    disabled={isRunning || isPaused}
                  />
                ) : (
                  <RecipientsList
                    validEmails={recipientList}
                    invalidEmails={confirmedResult?.invalid}
                    duplicates={confirmedResult?.duplicates}
                    onClear={handleClearRecipients}
                    disabled={isRunning || isPaused}
                  />
                )}
              </>
            )}
          </div>

          <div className="border-t pt-6">
            <BatchSettings
              batchSize={batchSize}
              batchDelaySeconds={batchDelaySeconds}
              onBatchSizeChange={setBatchSize}
              onBatchDelayChange={setBatchDelaySeconds}
              disabled={isRunning || isPaused || !!campaignId}
            />
          </div>
        </div>

        {(isRunning || isPaused || campaignId) && (
          <CampaignProgress
            progress={progress}
            isRunning={isRunning}
            isConnected={isConnected}
          />
        )}

        {lastError && (
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-red-700">{lastError}</p>
          </div>
        )}

        <div className="mt-8">
          <CampaignControls
            status={status}
            recipientCount={progress.total}
            canStart={canStart}
            batchSize={batchSize}
            onStart={handleCreateAndStart}
            onPause={pauseCampaign}
            onResume={resumeCampaign}
            onStop={stopCampaign}
          />
        </div>
      </div>
    </div>
  );
}
