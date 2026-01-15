'use client';

import { useSession } from 'next-auth/react';
import AuthButton from '@/components/AuthButton';
import EmailComposer from '@/components/EmailComposer';
import LandingPage from '@/components/LandingPage';
import QuotaDisplay from '@/components/QuotaDisplay';
import { cn } from '@/lib/utils';

export default function Home() {
  const { data: session } = useSession();

  if (!session) {
    return <LandingPage />;
  }

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
              Send batch emails with BCC
            </p>
          </div>
          <div className={cn('flex', 'items-center', 'gap-4')}>
            <QuotaDisplay />
            <AuthButton />
          </div>
        </div>
        <EmailComposer />
      </div>
    </main>
  );
}
