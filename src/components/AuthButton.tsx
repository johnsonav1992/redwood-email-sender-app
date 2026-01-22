'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

export default function AuthButton() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div className={cn('flex', 'items-center', 'gap-4')}>
        <span className={cn('text-sm', 'text-gray-600')}>
          Signed in as: {session.user?.email}
        </span>
        <button
          onClick={() => signOut()}
          className={cn(
            'cursor-pointer',
            'rounded-lg',
            'bg-gray-100',
            'px-4',
            'py-2',
            'font-semibold',
            'text-gray-800',
            'transition',
            'hover:bg-gray-200'
          )}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn('google')}
      className={cn(
        'cursor-pointer',
        'rounded-lg',
        'bg-blue-600',
        'px-6',
        'py-3',
        'font-semibold',
        'text-white',
        'transition',
        'hover:bg-blue-700'
      )}
    >
      Sign in with Google
    </button>
  );
}
