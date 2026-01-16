import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getInitialData } from '@/lib/actions';
import Dashboard from '@/components/Dashboard';
import LandingPage from '@/components/LandingPage';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <LandingPage />;
  }

  const { campaigns, quota } = await getInitialData();

  return <Dashboard initialCampaigns={campaigns} initialQuota={quota} />;
}
