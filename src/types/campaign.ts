export type CampaignStatus =
  | 'draft'
  | 'running'
  | 'paused'
  | 'completed'
  | 'stopped';
export type RecipientStatus = 'pending' | 'sending' | 'sent' | 'failed';

export interface Campaign {
  id: string;
  user_email: string;
  name: string | null;
  subject: string;
  body: string;
  signature: string | null;
  to_email: string | null;
  batch_size: number;
  batch_delay_seconds: number;
  status: CampaignStatus;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  last_batch_at: string | null;
  next_batch_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recipient {
  id: string;
  campaign_id: string;
  email: string;
  status: RecipientStatus;
  error_message: string | null;
  batch_number: number | null;
  sent_at: string | null;
}

export interface CampaignImage {
  id: string;
  campaign_id: string;
  content_id: string;
  filename: string;
  mime_type: string;
  base64_data: string;
}

export interface CreateCampaignInput {
  user_email: string;
  name?: string;
  subject: string;
  body: string;
  signature?: string;
  to_email?: string;
  batch_size?: number;
  batch_delay_seconds?: number;
  recipients: string[];
}

export interface CampaignWithProgress extends Campaign {
  pending_count: number;
}

export interface ParsedEmailResult {
  valid: string[];
  invalid: { email: string; reason: string }[];
  duplicates: string[];
}
