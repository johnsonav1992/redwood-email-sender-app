import { cn } from '@/lib/utils';

export default function CampaignsLoading() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
              </div>
              <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-100" />
              <div className="mt-2 h-4 w-full animate-pulse rounded bg-gray-50" />
              <div className="mt-1 h-4 w-3/4 animate-pulse rounded bg-gray-50" />
              <div className="mt-3 flex items-center gap-4">
                <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
              </div>
              <div className={cn('mt-3', 'p-2', 'bg-gray-50', 'rounded-lg')}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="h-3 w-14 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-8 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="h-1.5 w-full animate-pulse rounded-full bg-gray-200" />
                <div className="mt-2 flex items-center gap-4">
                  <div className="h-3 w-14 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-18 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            </div>
            <div className="ml-4 flex flex-col items-end gap-2">
              <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
              <div className="h-8 w-16 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
