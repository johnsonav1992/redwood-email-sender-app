'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { GoogleLogo } from '@/components/GoogleLogo';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const isAccessDenied = error === 'AccessDenied';

  return (
    <main
      className={cn(
        'min-h-screen',
        'bg-linear-to-br',
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
            <div className="mb-6 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-7 w-7 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
            </div>
            <h2
              className={cn('mb-4', 'text-2xl', 'font-bold', 'text-gray-900')}
            >
              {isAccessDenied ? 'Access Denied' : 'Sign-In Error'}
            </h2>
            <p className={cn('mb-8', 'text-gray-600')}>
              {isAccessDenied
                ? 'This app requires your Redwood Financial Google account (e.g. name@redwoodfp.com). Please sign in with that account.'
                : 'An error occurred during sign-in. Please try again.'}
            </p>
            <button
              onClick={() => signIn('google', { callbackUrl: '/' })}
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

export default function AuthErrorPage() {
  return (
    <Suspense>
      <AuthErrorContent />
    </Suspense>
  );
}
