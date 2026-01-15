'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useCampaignStream } from '@/hooks/useCampaignStream';
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
import { useState } from 'react';

type View = 'compose' | 'campaigns';

interface EmailComposerProps {
  view: View;
  onViewChange: (view: string) => void;
}

export default function EmailComposer({ view, onViewChange }: EmailComposerProps) {
  const { data: session } = useSession();
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
    setInitialProgress,
  } = useCampaignStream({
    campaignId,
    batchDelaySeconds,
    onStatusChange: handleStatusChange,
    onSendBatch: handleSendBatch,
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
    setInitialProgress({
      total: campaign.total_recipients,
      sent: campaign.sent_count,
      failed: campaign.failed_count,
      pending: campaign.pending_count,
    });
    setBatchSize(campaign.batch_size);
    setBatchDelaySeconds(campaign.batch_delay_seconds);
    setSubject(campaign.subject);
    setHtmlBody(campaign.body);
    setSignature(campaign.signature || '');
    await fetchCampaign(campaign.id);
    onViewChange('compose');
    // Don't auto-start/resume campaigns - let user manually click Resume/Start
    // This prevents accidental duplicate sends on page refresh
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
    setInitialProgress({ total: 0, sent: 0, failed: 0, pending: 0 });
    onViewChange('compose');
  };

  const handleClearRecipients = () => {
    setRecipientList([]);
    setConfirmedResult(null);
  };

  if (!session) {
    return null;
  }

  const progress = streamProgress.total > 0
    ? streamProgress
    : currentCampaign?.progress || { total: recipientList.length, sent: 0, failed: 0, pending: recipientList.length };
  const canStart = !campaignId && subject.trim() !== '' && htmlBody.trim() !== '' && recipientList.length > 0;

  return (
    <div className={cn('space-y-6')}>
      {view === 'campaigns' ? (
        <CampaignList
          campaigns={campaigns}
          onSelect={handleSelectCampaign}
          onDelete={handleDeleteCampaign}
          loading={persistenceLoading}
        />
      ) : (
        <div className={cn('bg-white', 'rounded-xl', 'shadow-sm', 'p-6')}>
          {campaignId && (
            <div className={cn('flex', 'items-center', 'justify-between', 'mb-6', 'pb-4', 'border-b', 'border-gray-200')}>
              <div>
                <span className={cn('text-sm', 'text-gray-500')}>Editing campaign</span>
                <h3 className={cn('font-medium', 'text-gray-900')}>{subject || 'Untitled'}</h3>
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
              isConnected={isConnected}
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
        </div>
      )}
    </div>
  );
}
