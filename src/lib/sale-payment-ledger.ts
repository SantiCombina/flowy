import { sql } from '@payloadcms/db-postgres';

interface SqlExecutor {
  execute: (query: unknown) => Promise<unknown>;
}

interface TransactionSession {
  db: unknown;
}

export interface TransactionSessions {
  [id: string]: TransactionSession;
}

function isSqlExecutor(value: unknown): value is SqlExecutor {
  return typeof value === 'object' && value !== null && 'execute' in value && typeof value.execute === 'function';
}

export async function lockSaleForUpdate(
  sessions: TransactionSessions | undefined,
  transactionID: string | number,
  saleId: number,
): Promise<void> {
  const transaction = sessions?.[transactionID]?.db;
  if (!isSqlExecutor(transaction)) throw new Error('No se pudo obtener la transacción de base de datos');
  await transaction.execute(sql`SELECT "id" FROM "sales" WHERE "id" = ${saleId} FOR UPDATE`);
}

export function assertSaleWithoutPayments(amountPaid: number | null | undefined, operation: 'edit' | 'delete'): void {
  if ((amountPaid ?? 0) <= 0) return;
  if (operation === 'edit') throw new Error('No se puede editar una venta con cobros registrados');
  throw new Error('No se puede eliminar una venta con cobros registrados');
}
