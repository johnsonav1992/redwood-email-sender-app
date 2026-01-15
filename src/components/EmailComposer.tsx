'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useCampaign } from '@/hooks/useCampaign';
import { useCampaignPersistence } from '@/hooks/useCampaignPersistence';
import FileUploader from './FileUploader';
import EmailValidator from './EmailValidator';
import RecipientsList from './RecipientsList';
import BatchSettings from './BatchSettings';
import SignatureEditor from './SignatureEditor';
import CampaignList from './CampaignList';
import CampaignProgress from './CampaignProgress';
import CampaignControls from './CampaignControls';
import type { ParsedEmailResult, CampaignWithProgress, CampaignStatus } from '@/types/campaign';

interface EmailComposerProps {
  onBatchSent?: () => void;
}

type View = 'compose' | 'campaigns';

export default function EmailComposer({ onBatchSent }: EmailComposerProps) {
  const { data: session } = useSession();

  const [view, setView] = useState<View>('compose');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [signature, setSignature] = useState('');
  const [recipientList, setRecipientList] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState(30);
  const [batchDelaySeconds, setBatchDelaySeconds] = useState(60);
  const [uploadResult, setUploadResult] = useState<ParsedEmailResult | null>(null);
  const [confirmedResult, setConfirmedResult] = useState<ParsedEmailResult | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const campaignIdRef = useRef<string | null>(null);

  const {
    campaigns,
    currentCampaign,
    loading: persistenceLoading,
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaignStatus,
    deleteCampaign,
    sendNextBatch,
  } = useCampaignPersistence();

  const handleSendBatch = useCallback(async () => {
    const id = campaignIdRef.current;
    if (!id) {
      return { success: false, completed: false, error: 'No campaign selected' };
    }

    const result = await sendNextBatch(id);

    if (result.quotaExhausted) {
      return { success: false, completed: false, quotaExhausted: true };
    }

    return {
      success: result.success,
      completed: result.completed,
      error: result.error,
    };
  }, [sendNextBatch]);

  const handleStatusChange = useCallback(
    async (status: CampaignStatus) => {
      const id = campaignIdRef.current;
      if (!id) return false;
      return await updateCampaignStatus(id, status);
    },
    [updateCampaignStatus]
  );

  const {
    status,
    nextBatchIn,
    lastError,
    isRunning,
    isPaused,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    stopCampaign,
    setInitialStatus,
  } = useCampaign({
    campaignId,
    batchDelaySeconds,
    onSendBatch: handleSendBatch,
    onStatusChange: handleStatusChange,
    onQuotaRefresh: onBatchSent,
  });

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

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
      recipients: recipientList,
    });

    if (campaign) {
      campaignIdRef.current = campaign.id;
      setCampaignId(campaign.id);
      setInitialStatus('draft');
      await fetchCampaign(campaign.id);
      startCampaign(campaign.id);
    }
  };

  const handleSelectCampaign = async (campaign: CampaignWithProgress) => {
    campaignIdRef.current = campaign.id;
    setCampaignId(campaign.id);
    setInitialStatus(campaign.status);
    setBatchSize(campaign.batch_size);
    setBatchDelaySeconds(campaign.batch_delay_seconds);
    setSubject(campaign.subject);
    setHtmlBody(campaign.body);
    setSignature(campaign.signature || '');
    await fetchCampaign(campaign.id);
    setView('compose');

    if (campaign.status === 'paused') {
      resumeCampaign();
    } else if (campaign.status === 'draft') {
      startCampaign(campaign.id);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      await deleteCampaign(id);
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
    setView('compose');
  };

  const handleClearRecipients = () => {
    setRecipientList([]);
    setConfirmedResult(null);
  };

  if (!session) {
    return null;
  }

  const progress = currentCampaign?.progress || { total: recipientList.length, sent: 0, failed: 0, pending: recipientList.length };
  const canStart = !campaignId && subject.trim() !== '' && htmlBody.trim() !== '' && recipientList.length > 0;

  return (
    <div className={cn('space-y-6', 'rounded-xl', 'bg-white', 'p-8', 'shadow-sm')}>
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setView('compose')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              view === 'compose' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Compose
          </button>
          <button
            onClick={() => setView('campaigns')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              view === 'campaigns' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Campaigns ({campaigns.length})
          </button>
        </div>
        {view === 'compose' && campaignId && (
          <button
            onClick={handleNewCampaign}
            className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            New Campaign
          </button>
        )}
      </div>

      {view === 'campaigns' ? (
        <CampaignList
          campaigns={campaigns}
          onSelect={handleSelectCampaign}
          onDelete={handleDeleteCampaign}
          loading={persistenceLoading}
        />
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
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
                Email Body (HTML)
              </label>
              <textarea
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                rows={8}
                placeholder="<p>Hello!</p>"
                disabled={isRunning || isPaused}
                className={cn(
                  'w-full rounded-lg border-2 border-gray-200 px-4 py-2 font-mono text-sm transition',
                  'focus:border-blue-500 focus:outline-none',
                  'disabled:cursor-not-allowed disabled:bg-gray-50'
                )}
              />
            </div>

            <SignatureEditor
              signature={signature}
              onSignatureChange={setSignature}
              disabled={isRunning || isPaused}
            />

            <div className="border-t pt-4">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Recipients</label>
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

            <div className="border-t pt-4">
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
              currentBatchSending={isRunning}
              nextBatchIn={nextBatchIn}
            />
          )}

          {lastError && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-red-700">{lastError}</p>
            </div>
          )}

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
        </>
      )}
    </div>
  );
}
