import { cn } from '@/lib/utils';

export default function CampaignsLoading() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 border border-gray-200 rounded-lg bg-white">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
              </div>
              <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-1" />
              <div className="h-4 w-full bg-gray-50 rounded animate-pulse mt-2" />
              <div className="h-4 w-3/4 bg-gray-50 rounded animate-pulse mt-1" />
              <div className="flex items-center gap-4 mt-3">
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className={cn('mt-3', 'p-2', 'bg-gray-50', 'rounded-lg')}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="h-3 w-14 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-8 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full animate-pulse" />
                <div className="flex items-center gap-4 mt-2">
                  <div className="h-3 w-14 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-18 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 ml-4">
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
