import AuthButton from '@/components/AuthButton';
import EmailComposer from '@/components/EmailComposer';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gmail Batch Sender</h1>
            <p className="text-gray-600 mt-1">Send emails in batches of 30 every minute</p>
          </div>
          <AuthButton />
        </div>
        <EmailComposer />
      </div>
    </main>
  );
}
