'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import EmailComposer from '@/components/EmailComposer';
import LandingPage from '@/components/LandingPage';
import { cn } from '@/lib/utils';

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

export default function Home() {
  const { status } = useSession();
  const [activeNav, setActiveNav] = useState('compose');

  if (status === 'loading') {
    return (
      <main className={cn('min-h-screen', 'bg-gray-50', 'flex', 'items-center', 'justify-center')}>
        <div className={cn('flex', 'flex-col', 'items-center', 'gap-4')}>
          <div className={cn('h-8', 'w-8', 'animate-spin', 'rounded-full', 'border-4', 'border-gray-200', 'border-t-blue-600')} />
          <p className={cn('text-gray-600')}>Loading...</p>
        </div>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return <LandingPage />;
  }

  return (
    <DashboardLayout
      activeNav={activeNav}
      onNavChange={setActiveNav}
      navItems={navItems}
    >
      <EmailComposer
        view={activeNav as 'compose' | 'campaigns'}
        onViewChange={setActiveNav}
      />
    </DashboardLayout>
  );
}
