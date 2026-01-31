'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';

export default function AuthExpiredPage() {
  useEffect(() => {
    signOut({ callbackUrl: '/' });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-slate-600" />
        <p className="text-gray-600">Session expired. Signing you out...</p>
      </div>
    </div>
  );
}
