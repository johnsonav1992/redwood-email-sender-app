import { ReactNode } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { fetchQuota } from '@/lib/actions';
import DashboardLayout from '@/components/DashboardLayout';

export default async function DashboardRouteLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/');
  }

  const { quota } = await fetchQuota();

  return <DashboardLayout initialQuota={quota}>{children}</DashboardLayout>;
}
