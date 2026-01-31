import { redirect } from 'next/navigation';
import { getInitialData } from '@/lib/actions';
import { AUTH_ERROR_CODE } from '@/lib/gmail';
import CampaignListPage from '@/components/CampaignListPage';

export default async function CampaignsPage() {
  const { campaigns, error } = await getInitialData();

  if (error === AUTH_ERROR_CODE) {
    redirect('/auth-expired');
  }

  return <CampaignListPage initialCampaigns={campaigns} />;
}
