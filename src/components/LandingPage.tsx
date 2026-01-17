'use client';

import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { GoogleLogo } from './GoogleLogo';

export default function LandingPage() {
  return (
    <main
      className={cn(
        'min-h-screen',
        'bg-gradient-to-br',
        'from-blue-50',
        'via-white',
        'to-gray-50'
      )}
    >
      <div className={cn('mx-auto', 'max-w-6xl', 'px-4', 'py-12')}>
        <div className={cn('mb-12', 'text-center')}>
          <div className={cn('mb-8', 'flex', 'justify-center')}>
            <Image
              src="/redwood-logo.png"
              alt="Redwood Financial"
              width={400}
              height={120}
              priority
              className={cn('h-auto', 'w-auto', 'max-w-md')}
            />
          </div>
          <h1 className={cn('mb-4', 'text-3xl', 'font-bold', 'text-gray-900')}>
            Email Campaign Sender
          </h1>
        </div>
        <div className={cn('mx-auto', 'max-w-lg')}>
          <div
            className={cn(
              'rounded-2xl',
              'bg-white',
              'p-12',
              'shadow-xl',
              'border',
              'border-gray-100',
              'text-center'
            )}
          >
            <h2
              className={cn('mb-4', 'text-2xl', 'font-bold', 'text-gray-900')}
            >
              Sign In
            </h2>
            <p className={cn('mb-8', 'text-gray-600')}>
              Use your Redwood Financial Google account
            </p>
            <button
              onClick={() => signIn('google')}
              className={cn(
                'inline-flex',
                'items-center',
                'gap-3',
                'rounded-lg',
                'bg-redwood',
                'px-8',
                'py-4',
                'text-lg',
                'font-semibold',
                'text-white',
                'shadow-lg',
                'transition',
                'hover:bg-redwood-light',
                'hover:shadow-xl',
                'cursor-pointer'
              )}
            >
              <GoogleLogo />
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
