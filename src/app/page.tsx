import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import LandingPage from '@/components/LandingPage';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/compose');
  }

  return <LandingPage />;
}
