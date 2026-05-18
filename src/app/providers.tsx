'use client';

import { SessionProvider } from 'next-auth/react';
import DeploymentGuard from '@/components/DeploymentGuard';
import LogRocketInitializer from '@/components/LogRocketInitializer';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LogRocketInitializer />
      <DeploymentGuard />
      {children}
    </SessionProvider>
  );
}
