'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function AuthButton() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          Signed in as: {session.user?.email}
        </span>
        <button
          onClick={() => signOut()}
          className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-800 transition hover:bg-gray-200"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
    >
      Sign in with Google
    </button>
  );
}
