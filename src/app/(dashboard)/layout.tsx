import { ReactNode } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { fetchQuota } from '@/lib/actions';
import { AUTH_ERROR_CODE } from '@/lib/gmail';
import DashboardLayout from '@/components/DashboardLayout';

export default async function DashboardRouteLayout({
  children
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/');
  }

  const { quota, error } = await fetchQuota();

  if (error === AUTH_ERROR_CODE) {
    redirect('/auth-expired');
  }

  return <DashboardLayout initialQuota={quota}>{children}</DashboardLayout>;
}
