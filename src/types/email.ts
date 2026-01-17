export interface EmailResult {
  email: string;
  status: 'sent' | 'failed';
  timestamp?: string;
  error?: string;
}

export interface FailedEmail {
  email: string;
  error: string;
}

export interface Progress {
  sent: number;
  failed: number;
  total: number;
}

export interface BatchSendRequest {
  recipients: string[];
  subject: string;
  htmlBody: string;
  batchSize?: number;
}

export interface BatchSendResponse {
  batchSize: number;
  sent: number;
  failed: number;
  remaining: number;
  results: EmailResult[];
}

export interface ErrorResponse {
  error: string;
  details?: string;
}
