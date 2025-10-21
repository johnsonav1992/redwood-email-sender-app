'use client';

import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
        {/* Header */}
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
              <svg
                className={cn('h-6', 'w-6')}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
