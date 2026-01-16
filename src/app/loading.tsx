import { cn } from '@/lib/utils';

export default function Loading() {
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
          'pl-4',
          'pr-8'
        )}
      >
        <div className={cn('w-64', 'flex', 'items-center')}>
          <div className={cn('h-12', 'w-40', 'bg-gray-200', 'rounded', 'animate-pulse')} />
        </div>
        <div className={cn('flex-1')} />
        <div className={cn('h-10', 'w-32', 'bg-gray-200', 'rounded', 'animate-pulse')} />
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
          <nav className={cn('flex-1', 'p-4', 'space-y-2')}>
            <div className={cn('h-10', 'bg-gray-200', 'rounded', 'animate-pulse')} />
            <div className={cn('h-10', 'bg-gray-200', 'rounded', 'animate-pulse')} />
          </nav>
          <div className={cn('p-4', 'border-t', 'border-gray-200')}>
            <div className={cn('flex', 'items-center', 'gap-3')}>
              <div className={cn('h-10', 'w-10', 'bg-gray-200', 'rounded-full', 'animate-pulse')} />
              <div className={cn('flex-1', 'space-y-2')}>
                <div className={cn('h-4', 'w-24', 'bg-gray-200', 'rounded', 'animate-pulse')} />
                <div className={cn('h-3', 'w-32', 'bg-gray-200', 'rounded', 'animate-pulse')} />
              </div>
            </div>
          </div>
        </aside>

        <main className={cn('flex-1', 'ml-64', 'p-8')}>
          <div className={cn('h-8', 'w-48', 'bg-gray-200', 'rounded', 'animate-pulse', 'mb-6')} />
          <div className={cn('space-y-4')}>
            <div className={cn('h-32', 'bg-white', 'rounded-lg', 'animate-pulse')} />
            <div className={cn('h-32', 'bg-white', 'rounded-lg', 'animate-pulse')} />
          </div>
        </main>
      </div>
    </div>
  );
}
