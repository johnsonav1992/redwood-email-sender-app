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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showFallbackAvatar = !session?.user?.image || avatarError;

  const closeSidebar = () => setSidebarOpen(false);

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
          'h-16',
          'lg:h-20',
          'flex',
          'items-center',
          'gap-2',
          'px-3',
          'lg:px-4',
          'lg:pr-8'
        )}
      >
        <div className={cn('lg:w-64', 'flex', 'items-center', 'shrink-0')}>
          <Image
            src="/redwood-logo.png"
            alt="Redwood Financial"
            width={200}
            height={60}
            priority
            className={cn('h-auto', 'w-auto', 'max-h-10', 'lg:max-h-16')}
          />
        </div>
        <div className={cn('flex-1', 'min-w-0')} />
        <div className="hidden lg:block">
          <QuotaDisplay initialQuota={initialQuota} />
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className={cn(
            'lg:hidden',
            'p-2',
            'rounded-lg',
            'text-gray-600',
            'hover:bg-gray-100',
            'active:bg-gray-200',
            'cursor-pointer',
            'shrink-0'
          )}
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>
      {sidebarOpen && (
        <div
          className={cn('lg:hidden', 'fixed', 'inset-0', 'z-30', 'bg-black/50')}
          onClick={closeSidebar}
        />
      )}
      <aside
        className={cn(
          'fixed',
          'top-0',
          'bottom-0',
          'left-0',
          'z-40',
          'w-72',
          'lg:w-64',
          'bg-white',
          'border-r',
          'border-gray-200',
          'flex',
          'flex-col',
          'transition-transform',
          'duration-300',
          'ease-in-out',
          'lg:translate-x-0',
          'lg:top-20',
          'lg:z-10',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className={cn('lg:hidden', 'flex', 'items-center', 'justify-between', 'h-16', 'px-4', 'border-b', 'border-gray-200')}>
          <Image
            src="/redwood-logo.png"
            alt="Redwood Financial"
            width={160}
            height={48}
            className={cn('h-auto', 'w-auto', 'max-h-10')}
          />
          <button
            onClick={closeSidebar}
            className={cn(
              'p-2',
              'rounded-lg',
              'text-gray-600',
              'hover:bg-gray-100',
              'active:bg-gray-200',
              'cursor-pointer'
            )}
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className={cn('flex-1', 'p-4', 'space-y-1')}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={closeSidebar}
              className={cn(
                'w-full',
                'flex',
                'items-center',
                'gap-3',
                'px-4',
                'py-4',
                'lg:py-3',
                'rounded-lg',
                'text-left',
                'text-base',
                'lg:text-sm',
                'transition-colors',
                'active:bg-gray-100',
                activeNav === item.id
                  ? 'bg-slate-100 text-slate-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {NAV_ICONS[item.id]}
              {item.label}
            </Link>
          ))}
          <div className="lg:hidden pt-4">
            <QuotaDisplay initialQuota={initialQuota} />
          </div>
        </nav>
        <div className={cn('p-4', 'border-t', 'border-gray-200')}>
          <div className={cn('flex', 'items-center', 'gap-3', 'mb-3')}>
            {showFallbackAvatar ? (
              <div
                className={cn(
                  'w-11',
                  'h-11',
                  'lg:w-10',
                  'lg:h-10',
                  'rounded-full',
                  'bg-slate-200',
                  'flex',
                  'items-center',
                  'justify-center',
                  'shrink-0'
                )}
              >
                <span className={cn('text-slate-700', 'font-medium')}>
                  {session?.user?.name?.[0] || session?.user?.email?.[0] || '?'}
                </span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user!.image!}
                alt=""
                className={cn('w-11', 'h-11', 'lg:w-10', 'lg:h-10', 'rounded-full', 'shrink-0')}
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
              'py-3',
              'lg:py-2',
              'text-base',
              'lg:text-sm',
              'text-gray-600',
              'hover:text-gray-900',
              'hover:bg-gray-50',
              'active:bg-gray-100',
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
      <div className={cn('flex', 'pt-16', 'lg:pt-20')}>
        <main className={cn('flex-1', 'lg:ml-64', 'p-4', 'sm:p-6', 'lg:p-8')}>
          <h1 className={cn('text-xl', 'sm:text-2xl', 'font-semibold', 'text-gray-900', 'mb-4', 'sm:mb-6')}>
            {NAV_ITEMS.find((item) => item.id === activeNav)?.label || 'Dashboard'}
          </h1>
          {children}
        </main>
      </div>
    </div>
  );
}
