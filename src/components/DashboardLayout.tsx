'use client';

import { ReactNode, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/lib/constants';
import QuotaDisplay from './QuotaDisplay';
import type { QuotaInfo } from '@/lib/gmail';

const NAV_ICONS: Record<string, React.ReactNode> = {
  compose: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  ),
  campaigns: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    </svg>
  ),
};

interface DashboardLayoutProps {
  children: ReactNode;
  initialQuota?: QuotaInfo | null;
}

export default function DashboardLayout({
  children,
  initialQuota,
}: DashboardLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const activeNav = pathname.startsWith('/campaigns') ? 'campaigns' : 'compose';
  const [avatarError, setAvatarError] = useState(false);

  const showFallbackAvatar = !session?.user?.image || avatarError;

  return (
    <div className={cn('min-h-screen', 'bg-gray-100')}>
      <header
        className={cn(
          'bg-white',
          'border-b',
          'border-gray-200',
          'fixed',
          'top-0',
          'left-0',
          'right-0',
          'z-20',
          'h-20',
          'flex',
          'items-center',
          'pl-4', 'pr-8'
        )}
      >
        <div className={cn('w-64', 'flex', 'items-center')}>
          <Image
            src="/redwood-logo.png"
            alt="Redwood Financial"
            width={200}
            height={60}
            priority
            className={cn('h-auto', 'w-auto', 'max-h-16')}
          />
        </div>

        <div className={cn('flex-1')} />

        <QuotaDisplay initialQuota={initialQuota} />
      </header>

      <div className={cn('flex', 'pt-20')}>
        <aside
          className={cn(
            'w-64',
            'bg-white',
            'border-r',
            'border-gray-200',
            'fixed',
            'top-20',
            'bottom-0',
            'left-0',
            'flex',
            'flex-col'
          )}
        >
          <nav className={cn('flex-1', 'p-4', 'space-y-1')}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'w-full',
                  'flex',
                  'items-center',
                  'gap-3',
                  'px-4',
                  'py-3',
                  'rounded-lg',
                  'text-left',
                  'transition-colors',
                  activeNav === item.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                {NAV_ICONS[item.id]}
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={cn('p-4', 'border-t', 'border-gray-200')}>
            <div className={cn('flex', 'items-center', 'gap-3', 'mb-3')}>
              {showFallbackAvatar ? (
                <div
                  className={cn(
                    'w-10',
                    'h-10',
                    'rounded-full',
                    'bg-blue-100',
                    'flex',
                    'items-center',
                    'justify-center'
                  )}
                >
                  <span className={cn('text-blue-700', 'font-medium')}>
                    {session?.user?.name?.[0] || session?.user?.email?.[0] || '?'}
                  </span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user!.image!}
                  alt=""
                  className={cn('w-10', 'h-10', 'rounded-full')}
                  onError={() => setAvatarError(true)}
                />
              )}
              <div className={cn('flex-1', 'min-w-0')}>
                <p className={cn('text-sm', 'font-medium', 'text-gray-900', 'truncate')}>
                  {session?.user?.name || 'User'}
                </p>
                <p className={cn('text-xs', 'text-gray-500', 'truncate')}>
                  {session?.user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className={cn(
                'w-full',
                'px-4',
                'py-2',
                'text-sm',
                'text-gray-600',
                'hover:text-gray-900',
                'hover:bg-gray-50',
                'rounded-lg',
                'transition-colors',
                'cursor-pointer',
                'text-left',
                'flex',
                'items-center',
                'gap-2'
              )}
            >
              <svg
                className={cn('w-5', 'h-5')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign out
            </button>
          </div>
        </aside>

        <main className={cn('flex-1', 'ml-64', 'p-8')}>
          <h1 className={cn('text-2xl', 'font-semibold', 'text-gray-900', 'mb-6')}>
            {NAV_ITEMS.find((item) => item.id === activeNav)?.label || 'Dashboard'}
          </h1>
          {children}
        </main>
      </div>
    </div>
  );
}
