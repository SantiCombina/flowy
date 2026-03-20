import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getClients } from '@/app/services/clients';
import { ClientsSection } from '@/components/clients/clients-section';
import { getCurrentUser } from '@/lib/payload';

export const metadata: Metadata = {
  title: 'Clientes',
};

export default async function ClientsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  let ownerId: number;
  let sellerId: number | undefined;

  if (user.role === 'owner') {
    ownerId = user.id;
  } else if (user.role === 'seller') {
    ownerId = typeof user.owner === 'number' ? user.owner : (user.owner?.id ?? 0);
    sellerId = user.id;
  } else {
    redirect('/');
  }

  const clients = await getClients({ ownerId, sellerId });

  return <ClientsSection clients={clients} currentUser={user} />;
}
