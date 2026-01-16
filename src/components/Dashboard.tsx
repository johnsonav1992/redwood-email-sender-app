'use client';

import { useState, useCallback, useTransition } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import EmailComposer from '@/components/EmailComposer';
import { cn } from '@/lib/utils';
import type { CampaignWithProgress } from '@/types/campaign';
import type { QuotaInfo } from '@/lib/gmail';

const navItems = [
  {
    id: 'compose',
    label: 'New Campaign',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
    ),
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
];

interface DashboardProps {
  initialCampaigns: CampaignWithProgress[];
  initialQuota: QuotaInfo | null;
}

export default function Dashboard({ initialCampaigns, initialQuota }: DashboardProps) {
  const [activeNav, setActiveNav] = useState('compose');

  return (
    <DashboardLayout
      activeNav={activeNav}
      onNavChange={setActiveNav}
      navItems={navItems}
      initialQuota={initialQuota}
    >
      <EmailComposer
        view={activeNav as 'compose' | 'campaigns'}
        onViewChange={setActiveNav}
        initialCampaigns={initialCampaigns}
      />
    </DashboardLayout>
  );
}
