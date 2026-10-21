import { sql } from '@payloadcms/db-postgres';

import type { TransactionSessions } from '@/lib/sale-payment-ledger';

interface SqlExecutor {
  execute(query: unknown): Promise<unknown>;
}

function isSqlExecutor(value: unknown): value is SqlExecutor {
  return typeof value === 'object' && value !== null && 'execute' in value && typeof value.execute === 'function';
}

export async function lockInvitation(
  sessions: TransactionSessions | undefined,
  transactionID: string | number,
  token: string,
): Promise<void> {
  const transaction = sessions?.[transactionID]?.db;
  if (!isSqlExecutor(transaction)) throw new Error('No se pudo obtener la transacción de base de datos');
  await transaction.execute(sql`SELECT "id" FROM "invitations" WHERE "token" = ${token} FOR UPDATE`);
}

export async function lockInvitationEmail(
  sessions: TransactionSessions | undefined,
  transactionID: string | number,
  email: string,
): Promise<void> {
  const transaction = sessions?.[transactionID]?.db;
  if (!isSqlExecutor(transaction)) throw new Error('No se pudo obtener la transacción de base de datos');
  await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`flowy:owner-invitation:${email}`}))`);
}

export async function hasPendingOwnerInvitation(
  sessions: TransactionSessions | undefined,
  transactionID: string | number,
  email: string,
  now: string,
  excludedId?: number,
): Promise<boolean> {
  const transaction = sessions?.[transactionID]?.db;
  if (!isSqlExecutor(transaction)) throw new Error('No se pudo obtener la transacción de base de datos');
  const result = await transaction.execute(sql`
    SELECT "id" FROM "invitations"
    WHERE lower(btrim("email")) = ${email}
      AND "role" = 'owner'
      AND "state" = 'pending'
      AND "expires_at" > ${now}
      ${excludedId === undefined ? sql`` : sql`AND "id" <> ${excludedId}`}
    LIMIT 1
  `);
  if (typeof result !== 'object' || result === null || !('rows' in result) || !Array.isArray(result.rows)) {
    throw new Error('No se pudo consultar las invitaciones pendientes');
  }
  return result.rows.length > 0;
}
