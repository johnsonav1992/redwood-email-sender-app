import { redirect } from 'next/navigation';
import { getInitialData } from '@/lib/actions';
import { AUTH_ERROR_CODE } from '@/lib/gmail';
import ComposeForm from '@/components/ComposeForm';

export default async function ComposePage() {
  const { campaigns, error } = await getInitialData();

  if (error === AUTH_ERROR_CODE) {
    redirect('/auth-expired');
  }

  return <ComposeForm initialCampaigns={campaigns} />;
}
