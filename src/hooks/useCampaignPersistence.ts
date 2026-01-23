import { useState, useCallback, useTransition } from 'react';
import {
  createCampaign as createCampaignAction,
  updateCampaignStatus as updateCampaignStatusAction,
  deleteCampaign as deleteCampaignAction,
  duplicateCampaign as duplicateCampaignAction,
  fetchCampaigns as fetchCampaignsAction
} from '@/lib/actions';
import type {
  Campaign,
  CampaignWithProgress,
  CampaignStatus,
  Recipient
} from '@/types/campaign';

interface CampaignDetail {
  campaign: Campaign;
  recipients: Recipient[];
  recipientsTotal: number;
  progress: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
}

interface UseCampaignPersistenceOptions {
  initialCampaigns?: CampaignWithProgress[];
}

export function useCampaignPersistence({
  initialCampaigns
}: UseCampaignPersistenceOptions = {}) {
  const [campaigns, setCampaigns] = useState<CampaignWithProgress[]>(
    initialCampaigns ?? []
  );
  const [currentCampaign, setCurrentCampaign] = useState<CampaignDetail | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchCampaignsAction();
      if (result.error) {
        throw new Error(result.error);
      }
      setCampaigns(result.campaigns);
      return result.campaigns;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCampaign = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch campaign');
      }

      setCurrentCampaign(data);
      return data as CampaignDetail;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCampaign = useCallback(
    async (data: {
      name?: string;
      subject: string;
      htmlBody: string;
      signature?: string;
      toEmail?: string;
      batchSize?: number;
      batchDelaySeconds?: number;
      recipients: string[];
    }) => {
      setLoading(true);
      setError(null);

      try {
        const result = await createCampaignAction(data);

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.campaign) {
          setCampaigns(prev => [
            result.campaign as CampaignWithProgress,
            ...prev
          ]);
          return result.campaign as CampaignWithProgress;
        }
        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateCampaignStatus = useCallback(
    async (id: string, status: CampaignStatus) => {
      setError(null);

      try {
        const result = await updateCampaignStatusAction(id, status);

        if (result.error) {
          throw new Error(result.error);
        }

        setCampaigns(prev =>
          prev.map(c => (c.id === id ? { ...c, status } : c))
        );

        if (currentCampaign?.campaign.id === id) {
          setCurrentCampaign(prev =>
            prev ? { ...prev, campaign: { ...prev.campaign, status } } : null
          );
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return false;
      }
    },
    [currentCampaign]
  );

  const deleteCampaign = useCallback(
    async (id: string) => {
      setError(null);

      try {
        const result = await deleteCampaignAction(id);

        if (result.error) {
          throw new Error(result.error);
        }

        setCampaigns(prev => prev.filter(c => c.id !== id));

        if (currentCampaign?.campaign.id === id) {
          setCurrentCampaign(null);
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return false;
      }
    },
    [currentCampaign]
  );

  const duplicateCampaign = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await duplicateCampaignAction(id);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.campaign) {
        setCampaigns(prev => [result.campaign as CampaignWithProgress, ...prev]);
        return result.campaign as CampaignWithProgress;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    campaigns,
    currentCampaign,
    loading: loading || isPending,
    error,
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaignStatus,
    deleteCampaign,
    duplicateCampaign,
    setCurrentCampaign
  };
}
