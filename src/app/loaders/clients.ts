import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { getClientDebts, getClients } from '@/app/services/clients';
import { resolveUserCapabilities } from '@/lib/entitlements/guards';
import { assertOperationAllowed } from '@/lib/entitlements/scoped-operations';
import { resolveId } from '@/lib/payload-utils';

export async function loadClients() {
  const guardedUser = await loadActiveGuardedUser();
  const user = guardedUser.user;

  if (user.role !== 'owner' && user.role !== 'seller') {
    throw new Error('No autorizado');
  }

  assertOperationAllowed(
    resolveUserCapabilities(user, guardedUser.dbSnapshot, guardedUser.entitlementState),
    'client.read',
  );

  let ownerId: number;
  let sellerId: number | undefined;

  if (user.role === 'owner') {
    ownerId = user.id;
  } else {
    ownerId = resolveId(user.owner) ?? 0;
    sellerId = user.id;
  }

  if (ownerId === 0) {
    throw new Error('No se pudo determinar el dueño del negocio');
  }

  const [clients, clientDebts] = await Promise.all([
    getClients({ ownerId, sellerId }),
    getClientDebts({ ownerId, sellerId }),
  ]);

  return { clients, clientDebts };
}
