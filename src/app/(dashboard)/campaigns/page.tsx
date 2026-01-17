import { getInitialData } from '@/lib/actions';
import CampaignListPage from '@/components/CampaignListPage';

export default async function CampaignsPage() {
  const { campaigns } = await getInitialData();

  return <CampaignListPage initialCampaigns={campaigns} />;
}
