import type { CampaignStatus } from '@/types/campaign';

export const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  running: 'bg-blue-100 text-blue-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  stopped: 'bg-red-100 text-red-700'
};

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  running: 'Running',
  paused: 'Paused',
  completed: 'Completed',
  stopped: 'Stopped'
};

export const NAV_ITEMS = [
  {
    id: 'compose',
    href: '/compose',
    label: 'New Campaign'
  },
  {
    id: 'campaigns',
    href: '/campaigns',
    label: 'Campaigns'
  }
] as const;
