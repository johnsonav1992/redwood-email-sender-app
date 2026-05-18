'use client';

import { useEffect, useRef, useState } from 'react';

const CHECK_INTERVAL_MS = 60_000;

async function fetchBuildId(): Promise<string | null> {
  try {
    const response = await fetch('/api/version', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { buildId?: string };
    return data.buildId || null;
  } catch {
    return null;
  }
}

export default function DeploymentGuard() {
  const currentBuildId = process.env.NEXT_PUBLIC_APP_BUILD_ID || 'development';
  const [stale, setStale] = useState(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    const checkForNewDeployment = async () => {
      if (checkingRef.current || stale) return;

      checkingRef.current = true;
      try {
        const latestBuildId = await fetchBuildId();
        if (latestBuildId && latestBuildId !== currentBuildId) {
          setStale(true);
        }
      } finally {
        checkingRef.current = false;
      }
    };

    const intervalId = window.setInterval(checkForNewDeployment, CHECK_INTERVAL_MS);
    const onFocus = () => {
      void checkForNewDeployment();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkForNewDeployment();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [currentBuildId, stale]);

  if (!stale) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-lg border border-amber-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-amber-900">App Updated</h2>
        <p className="mt-2 text-sm text-gray-700">
          A newer deployment is available. Reload to continue with the latest
          version.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded bg-amber-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
