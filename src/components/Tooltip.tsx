'use client';

import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

export default function Tooltip({
  content,
  children,
  position = 'top'
}: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        className={cn(
          'absolute left-1/2 -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-xs whitespace-nowrap text-white',
          'pointer-events-none z-10 opacity-0 transition-opacity duration-150 group-hover:opacity-100',
          position === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
        )}
      >
        {content}
        <span
          className={cn(
            'absolute left-1/2 -translate-x-1/2 border-4 border-transparent',
            position === 'top'
              ? 'top-full border-t-slate-800'
              : 'bottom-full border-b-slate-800'
          )}
        />
      </span>
    </span>
  );
}
