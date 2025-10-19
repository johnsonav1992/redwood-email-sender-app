import AuthButton from '@/components/AuthButton';
import EmailComposer from '@/components/EmailComposer';
import { cn } from '@/lib/utils';

export default function Home() {
  return (
    <main className={cn('min-h-screen', 'bg-gray-50', 'py-8')}>
      <div className={cn('mx-auto', 'max-w-5xl', 'px-4')}>
        <div
          className={cn(
            'mb-8',
            'flex',
            'items-center',
            'justify-between',
            'rounded-xl',
            'bg-white',
            'p-6',
            'shadow-sm'
          )}
        >
          <div>
            <h1 className={cn('text-3xl', 'font-bold', 'text-gray-900')}>
              Gmail Batch Sender
            </h1>
            <p className={cn('mt-1', 'text-gray-600')}>
              Send emails in batches of 1 every minute
            </p>
          </div>
          <AuthButton />
        </div>
        <EmailComposer />
      </div>
    </main>
  );
}
