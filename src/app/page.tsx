'use client';

import { useRef } from 'react';
import { useSession } from 'next-auth/react';
import AuthButton from '@/components/AuthButton';
import EmailComposer from '@/components/EmailComposer';
import LandingPage from '@/components/LandingPage';
import QuotaDisplay from '@/components/QuotaDisplay';
import { cn } from '@/lib/utils';

export default function Home() {
  const { data: session } = useSession();
  const quotaRefreshRef = useRef<(() => void) | null>(null);

  // Show landing page if not logged in
  if (!session) {
    return <LandingPage />;
  }

  // Show email composer for logged in users
  return (
    <main className={cn('min-h-screen', 'bg-gray-50', 'py-8')}>
      <div className={cn('mx-auto', 'max-w-5xl', 'px-4')}>
        <div
          className={cn(
            'mb-8',
            'flex',
            'items-center',
            'justify-between',
            'gap-4',
            'rounded-xl',
            'bg-white',
            'p-6',
            'shadow-sm'
          )}
        >
          <div>
            <h1 className={cn('text-3xl', 'font-bold', 'text-gray-900')}>
              Email Campaign Sender
            </h1>
            <p className={cn('mt-1', 'text-gray-600')}>
              Send emails in batches of 1 every minute
            </p>
          </div>
          <div className={cn('flex', 'items-center', 'gap-4')}>
            <QuotaDisplay onRefreshReady={fn => (quotaRefreshRef.current = fn)} />
            <AuthButton />
          </div>
        </div>
        <EmailComposer onBatchSent={() => quotaRefreshRef.current?.()} />
      </div>
    </main>
  );
}
