import AuthButton from '@/components/AuthButton';
import EmailComposer from '@/components/EmailComposer';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8 flex items-center justify-between rounded-xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gmail Batch Sender
            </h1>
            <p className="mt-1 text-gray-600">
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
