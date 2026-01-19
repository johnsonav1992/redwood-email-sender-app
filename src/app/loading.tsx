import { cn } from '@/lib/utils';

export default function Loading() {
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
            <div className={cn('h-24', 'w-80', 'bg-gray-200', 'rounded', 'animate-pulse')} />
          </div>
          <div className={cn('h-9', 'w-64', 'bg-gray-200', 'rounded', 'animate-pulse', 'mx-auto', 'mb-4')} />
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
            <div className={cn('h-8', 'w-24', 'bg-gray-200', 'rounded', 'animate-pulse', 'mx-auto', 'mb-4')} />
            <div className={cn('h-5', 'w-64', 'bg-gray-100', 'rounded', 'animate-pulse', 'mx-auto', 'mb-8')} />
            <div className={cn('h-14', 'w-56', 'bg-gray-200', 'rounded-lg', 'animate-pulse', 'mx-auto')} />
          </div>
        </div>
      </div>
    </main>
  );
}
