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
import AlertModal from './AlertModal';
import ManualEmailEntry from './ManualEmailEntry';
import RecipientStatusList from './RecipientStatusList';
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
  const [userBatchSize, setUserBatchSize] = useState<number | null>(null);
  const [userBatchDelaySeconds, setUserBatchDelaySeconds] = useState<
    number | null
  >(null);
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
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const {
    campaigns,
    currentCampaign,
    loading: persistenceLoading,
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaignStatus
  } = useCampaignPersistence({ initialCampaigns });

  const batchSize =
    userBatchSize ?? currentCampaign?.campaign?.batch_size ?? 30;
  const batchDelaySeconds =
    userBatchDelaySeconds ??
    currentCampaign?.campaign?.batch_delay_seconds ??
    60;

  const handleStatusChange = useCallback(
    async (newStatus: CampaignStatus) => {
      const id = campaignIdRef.current;
      if (!id) return false;
      return await updateCampaignStatus(id, newStatus);
    },
    [updateCampaignStatus]
  );

  const {
    status,
    progress: streamProgress,
    isConnected,
    lastError,
    nextBatchIn,
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
    onStatusChange: handleStatusChange
  });

  useEffect(() => {
    if (!initialCampaigns) {
      fetchCampaigns();
    }
  }, [initialCampaigns, fetchCampaigns]);

  const prevCampaignIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (campaignId !== prevCampaignIdRef.current) {
      prevCampaignIdRef.current = campaignId;
      setUserBatchSize(null);
      setUserBatchDelaySeconds(null);
    }
  }, [campaignId]);

  const prevEditIdRef = useRef<string | null>(null);
  useEffect(() => {
    const editId = searchParams.get('edit');
    const prevEditId = prevEditIdRef.current;
    prevEditIdRef.current = editId;

    if (prevEditId && !editId) {
      campaignIdRef.current = null;
      setCampaignId(null);
      setSubject('');
      setHtmlBody('');
      setSignature('');
      setRecipientList([]);
      setUploadResult(null);
      setConfirmedResult(null);
      setUserBatchSize(null);
      setUserBatchDelaySeconds(null);
      setInitialStatus('draft');
      setInitialProgress({ total: 0, sent: 0, failed: 0, pending: 0 });
    }
  }, [searchParams, setInitialStatus, setInitialProgress]);

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

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSaveDraft = async () => {
    if (!hasAnyContent) {
      showAlert('Cannot Save', 'Please fill in at least one field', 'error');
      return;
    }

    if (campaignId && isDraft) {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: subject.substring(0, 50) || 'Untitled Draft',
            subject,
            body: htmlBody,
            signature: signature || undefined,
            batch_size: batchSize,
            batch_delay_seconds: batchDelaySeconds,
            recipients: recipientList
          })
        });

        if (response.ok) {
          await fetchCampaign(campaignId);
          showAlert(
            'Draft Saved',
            'Your draft has been saved successfully!',
            'success'
          );
        } else {
          showAlert(
            'Save Failed',
            'Failed to save draft. Please try again.',
            'error'
          );
        }
      } catch (error) {
        console.error('Failed to update draft:', error);
        showAlert(
          'Save Failed',
          'Failed to save draft. Please try again.',
          'error'
        );
      }
      return;
    }

    const campaign = await createCampaign({
      name: subject.substring(0, 50) || 'Untitled Draft',
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
      showAlert(
        'Draft Created',
        'Your draft has been created successfully!',
        'success'
      );
      router.push(`/compose?edit=${campaign.id}`);
    } else {
      showAlert(
        'Save Failed',
        'Failed to create draft. Please try again.',
        'error'
      );
    }
  };

  const proceedWithCampaign = async () => {
    closeAlert();

    if (campaignId && status === 'draft') {
      startCampaign(campaignId);
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

  const handleCreateAndStart = async () => {
    if (!subject || !htmlBody || recipientList.length === 0) {
      showAlert(
        'Missing Information',
        'Please fill in subject, body, and upload recipients',
        'error'
      );
      return;
    }

    const invalidCount = confirmedResult?.invalid?.length || 0;
    const duplicateCount = confirmedResult?.duplicates?.length || 0;
    const excludedCount = invalidCount + duplicateCount;

    if (excludedCount > 0) {
      const parts = [];
      if (invalidCount > 0) parts.push(`${invalidCount} invalid`);
      if (duplicateCount > 0) parts.push(`${duplicateCount} duplicate`);

      setAlertModal({
        isOpen: true,
        title: 'Some Emails Excluded',
        message: `${parts.join(' and ')} email${excludedCount > 1 ? 's' : ''} will not be sent. Only ${recipientList.length} valid recipient${recipientList.length !== 1 ? 's' : ''} will receive this email.`,
        type: 'warning',
        onConfirm: proceedWithCampaign
      });
      return;
    }

    if (campaignId && status === 'draft') {
      startCampaign(campaignId);
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
    setUserBatchSize(null);
    setUserBatchDelaySeconds(null);
    setInitialStatus('draft');
    setInitialProgress({ total: 0, sent: 0, failed: 0, pending: 0 });
    router.push('/compose');
  };

  const handleClearRecipients = () => {
    setRecipientList([]);
    setConfirmedResult(null);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setRecipientList(prev => prev.filter(email => email !== emailToRemove));
  };

  const handleAddEmail = (email: string): boolean => {
    setRecipientList(prev => [...prev, email]);
    return true;
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
  const isDraft = status === 'draft';
  const hasAnyContent =
    subject.trim() !== '' || htmlBody.trim() !== '' || recipientList.length > 0;
  const hasAllContent =
    subject.trim() !== '' && htmlBody.trim() !== '' && recipientList.length > 0;
  const canStart = (!campaignId || isDraft) && hasAllContent;
  const canSaveDraft = hasAnyContent && (!campaignId || isDraft);

  return (
    <div className={cn('space-y-4', 'sm:space-y-6')}>
      <div
        className={cn('bg-white', 'rounded-xl', 'shadow-sm', 'p-4', 'sm:p-6')}
      >
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
                'w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-base transition',
                'focus:border-slate-400 focus:outline-none',
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
              enableImageResize={true}
            />
          </div>
          <SignatureEditor
            signature={signature}
            onSignatureChange={setSignature}
            disabled={isRunning || isPaused}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSendTest}
              disabled={!subject.trim() || !htmlBody.trim() || sendingTest}
              className={cn(
                'cursor-pointer rounded-lg border px-4 py-2.5 text-sm transition-colors',
                'border-gray-300 text-gray-600 hover:bg-gray-50 active:bg-gray-100',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              {sendingTest ? 'Sending...' : 'Send Test Email'}
            </button>
            {testSent && (
              <span className="text-sm text-green-600">
                Sent to {session?.user?.email}
              </span>
            )}
          </div>
          <div className="border-t pt-6">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Recipients
            </label>
            {!isDraft && currentCampaign && campaignId ? (
              <RecipientStatusList
                campaignId={campaignId}
                initialRecipients={currentCampaign.recipients}
                initialTotal={currentCampaign.recipientsTotal}
                progress={currentCampaign.progress}
              />
            ) : uploadResult ? (
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
                    onRemoveEmail={handleRemoveEmail}
                    disabled={isRunning || isPaused}
                  />
                )}
                <ManualEmailEntry
                  onAddEmail={handleAddEmail}
                  existingEmails={recipientList}
                  disabled={isRunning || isPaused}
                />
              </>
            )}
          </div>
          <div className="border-t pt-6">
            <BatchSettings
              batchSize={batchSize}
              batchDelaySeconds={batchDelaySeconds}
              onBatchSizeChange={setUserBatchSize}
              onBatchDelayChange={setUserBatchDelaySeconds}
              disabled={isRunning || isPaused || (!!campaignId && !isDraft)}
            />
          </div>
        </div>
        {(isRunning || isPaused || campaignId) && (
          <CampaignProgress
            progress={progress}
            isRunning={isRunning}
            isConnected={isConnected}
            nextBatchIn={nextBatchIn}
            batchSize={batchSize}
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
            canSaveDraft={canSaveDraft}
            batchSize={batchSize}
            onStart={handleCreateAndStart}
            onSaveDraft={handleSaveDraft}
            onPause={pauseCampaign}
            onResume={resumeCampaign}
            onStop={stopCampaign}
          />
        </div>
      </div>
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        onConfirm={alertModal.onConfirm}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        confirmLabel="Send Anyway"
        cancelLabel="Review"
      />
    </div>
  );
}
