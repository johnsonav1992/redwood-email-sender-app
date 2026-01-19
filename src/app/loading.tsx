import { cn } from '@/lib/utils';

function NavItemSkeleton() {
  return (
    <div className={cn('flex', 'items-center', 'gap-3', 'px-4', 'py-3', 'rounded-lg')}>
      <div className={cn('h-5', 'w-5', 'bg-gray-200', 'rounded', 'animate-pulse')} />
      <div className={cn('h-4', 'w-24', 'bg-gray-200', 'rounded', 'animate-pulse')} />
    </div>
  );
}

function ComposeFormSkeleton() {
  return (
    <div className={cn('bg-white', 'rounded-xl', 'shadow-sm', 'p-6')}>
      <div className={cn('space-y-6')}>
        {/* Subject field */}
        <div>
          <div className={cn('h-4', 'w-16', 'bg-gray-200', 'rounded', 'animate-pulse', 'mb-2')} />
          <div className={cn('h-10', 'w-full', 'bg-gray-100', 'rounded-lg', 'animate-pulse')} />
        </div>

        {/* Email Body / Rich Text Editor */}
        <div>
          <div className={cn('h-4', 'w-20', 'bg-gray-200', 'rounded', 'animate-pulse', 'mb-2')} />
          <div className={cn('border-2', 'border-gray-200', 'rounded-lg', 'overflow-hidden')}>
            {/* Toolbar */}
            <div className={cn('flex', 'items-center', 'gap-1', 'p-2', 'border-b', 'border-gray-200', 'bg-gray-50')}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={cn('h-7', 'w-7', 'bg-gray-200', 'rounded', 'animate-pulse')} />
              ))}
              <div className={cn('w-px', 'h-6', 'bg-gray-200', 'mx-1')} />
              {[7, 8, 9].map((i) => (
                <div key={i} className={cn('h-7', 'w-7', 'bg-gray-200', 'rounded', 'animate-pulse')} />
              ))}
            </div>
            {/* Editor area */}
            <div className={cn('h-64', 'p-4')}>
              <div className={cn('h-4', 'w-3/4', 'bg-gray-100', 'rounded', 'animate-pulse', 'mb-3')} />
              <div className={cn('h-4', 'w-1/2', 'bg-gray-100', 'rounded', 'animate-pulse', 'mb-3')} />
              <div className={cn('h-4', 'w-2/3', 'bg-gray-100', 'rounded', 'animate-pulse')} />
            </div>
          </div>
        </div>

        {/* Signature */}
        <div>
          <div className={cn('h-4', 'w-24', 'bg-gray-200', 'rounded', 'animate-pulse', 'mb-2')} />
          <div className={cn('h-20', 'w-full', 'bg-gray-100', 'rounded-lg', 'animate-pulse')} />
        </div>

        {/* Send Test Button */}
        <div className={cn('h-9', 'w-32', 'bg-gray-200', 'rounded', 'animate-pulse')} />

        {/* Recipients section */}
        <div className={cn('border-t', 'pt-6')}>
          <div className={cn('h-4', 'w-20', 'bg-gray-200', 'rounded', 'animate-pulse', 'mb-2')} />
          <div className={cn('border-2', 'border-dashed', 'border-gray-200', 'rounded-lg', 'p-8')}>
            <div className={cn('flex', 'flex-col', 'items-center', 'gap-3')}>
              <div className={cn('h-12', 'w-12', 'bg-gray-200', 'rounded-full', 'animate-pulse')} />
              <div className={cn('h-4', 'w-48', 'bg-gray-200', 'rounded', 'animate-pulse')} />
              <div className={cn('h-3', 'w-32', 'bg-gray-100', 'rounded', 'animate-pulse')} />
            </div>
          </div>
        </div>

        {/* Batch Settings */}
        <div className={cn('border-t', 'pt-6')}>
          <div className={cn('flex', 'items-center', 'gap-6')}>
            <div className={cn('flex', 'items-center', 'gap-2')}>
              <div className={cn('h-4', 'w-20', 'bg-gray-200', 'rounded', 'animate-pulse')} />
              <div className={cn('h-10', 'w-20', 'bg-gray-100', 'rounded-lg', 'animate-pulse')} />
            </div>
            <div className={cn('flex', 'items-center', 'gap-2')}>
              <div className={cn('h-4', 'w-32', 'bg-gray-200', 'rounded', 'animate-pulse')} />
              <div className={cn('h-10', 'w-20', 'bg-gray-100', 'rounded-lg', 'animate-pulse')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        <div
          className={cn(
            'flex',
            'items-center',
            'gap-3',
            'rounded-lg',
            'border-2',
            'border-gray-200',
            'bg-white',
            'px-4',
            'py-2'
          )}
        >
          <div className={cn('flex', 'items-center', 'gap-2')}>
            <div className={cn('h-2', 'w-2', 'animate-pulse', 'rounded-full', 'bg-gray-300')} />
            <div className={cn('flex', 'flex-col')}>
              <div className={cn('text-xs', 'text-gray-400')}>Daily Quota</div>
              <div className={cn('flex', 'items-baseline', 'gap-1', 'h-7')}>
                <div className={cn('h-5', 'w-10', 'bg-gray-200', 'rounded', 'animate-pulse', 'self-center')} />
                <span className={cn('text-sm', 'text-gray-300')}>/</span>
                <div className={cn('h-4', 'w-10', 'bg-gray-200', 'rounded', 'animate-pulse', 'self-center')} />
              </div>
            </div>
          </div>
          <div className={cn('h-4', 'w-4', 'bg-gray-200', 'rounded', 'animate-pulse')} />
        </div>
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
            <NavItemSkeleton />
            <NavItemSkeleton />
          </nav>
          <div className={cn('p-4', 'border-t', 'border-gray-200')}>
            <div className={cn('flex', 'items-center', 'gap-3', 'mb-3')}>
              <div className={cn('h-10', 'w-10', 'bg-gray-200', 'rounded-full', 'animate-pulse')} />
              <div className={cn('flex-1', 'min-w-0')}>
                <div className={cn('h-4', 'w-20', 'bg-gray-200', 'rounded', 'animate-pulse')} />
                <div className={cn('h-3', 'w-32', 'bg-gray-100', 'rounded', 'animate-pulse', 'mt-1')} />
              </div>
            </div>
            <div className={cn('flex', 'items-center', 'gap-2', 'px-4', 'py-2')}>
              <div className={cn('h-4', 'w-4', 'bg-gray-200', 'rounded', 'animate-pulse')} />
              <div className={cn('h-4', 'w-16', 'bg-gray-200', 'rounded', 'animate-pulse')} />
            </div>
          </div>
        </aside>

        <main className={cn('flex-1', 'ml-64', 'p-8')}>
          <div className={cn('h-8', 'w-32', 'bg-gray-200', 'rounded', 'animate-pulse', 'mb-6')} />
          <ComposeFormSkeleton />
        </main>
      </div>
    </div>
  );
}
