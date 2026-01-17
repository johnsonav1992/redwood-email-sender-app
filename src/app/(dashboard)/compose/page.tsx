import { getInitialData } from '@/lib/actions';
import ComposeForm from '@/components/ComposeForm';

export default async function ComposePage() {
  const { campaigns } = await getInitialData();

  return <ComposeForm initialCampaigns={campaigns} />;
}
