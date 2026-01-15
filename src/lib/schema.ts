export const SCHEMA_SQL = `
-- campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  signature TEXT,
  batch_size INTEGER DEFAULT 30,
  batch_delay_seconds INTEGER DEFAULT 60,
  status TEXT DEFAULT 'draft',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- recipients table
CREATE TABLE IF NOT EXISTS recipients (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  batch_number INTEGER,
  sent_at TEXT,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- campaign_images table (for inline images)
CREATE TABLE IF NOT EXISTS campaign_images (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  base64_data TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_email ON campaigns(user_email);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_recipients_campaign_id ON recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_campaign_status ON recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_images_campaign_id ON campaign_images(campaign_id);
`;
