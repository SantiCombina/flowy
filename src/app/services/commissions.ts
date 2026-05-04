'use server';

import { revalidateTag } from 'next/cache';
import type { Where } from 'payload';

import { getPayloadClient } from '@/lib/payload';
import { resolveId } from '@/lib/payload-utils';
import type { Sale } from '@/payload-types';

const COMMISSION_RATE = 0.03;

export interface CommissionSummary {
  totalCommission: number;
  totalPaid: number;
  pendingBalance: number;
  periodSales: number;
  periodCommission: number;
  periodPayments: number;
}

export interface CommissionPaymentRow {
  id: number;
  amount: number;
  date: string;
  paymentMethod: 'transfer' | 'cash' | 'check';
  reference?: string | null;
  notes?: string | null;
  createdAt: string;
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function getCommissionSummary(
  sellerId: number,
  ownerId: number,
  period?: { year: number; month: number },
): Promise<CommissionSummary> {
  const payload = await getPayloadClient();

  const salesConditions: Where[] = [{ seller: { equals: sellerId } }, { owner: { equals: ownerId } }];

  const allSalesResult = await payload.find({
    collection: 'sales',
    where: { and: salesConditions },
    depth: 0,
    limit: 10000,
    overrideAccess: true,
  });

  let totalCommission = 0;
  for (const sale of allSalesResult.docs as Sale[]) {
    totalCommission += sale.total * COMMISSION_RATE;
  }

  const allPaymentsResult = await payload.find({
    collection: 'commission-payments',
    where: { and: [{ seller: { equals: sellerId } }, { owner: { equals: ownerId } }] },
    depth: 0,
    limit: 10000,
    overrideAccess: true,
  });

  let totalPaid = 0;
  for (const payment of allPaymentsResult.docs) {
    totalPaid += payment.amount as number;
  }

  const pendingBalance = Math.max(0, totalCommission - totalPaid);

  const p = period ?? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  const { from, to } = getMonthRange(p.year, p.month);

  const periodSalesResult = await payload.find({
    collection: 'sales',
    where: {
      and: [...salesConditions, { date: { greater_than_equal: from } }, { date: { less_than: to } }],
    },
    depth: 0,
    limit: 10000,
    overrideAccess: true,
  });

  let periodSales = 0;
  let periodCommission = 0;
  for (const sale of periodSalesResult.docs as Sale[]) {
    periodSales += sale.total;
    periodCommission += sale.total * COMMISSION_RATE;
  }

  const periodPaymentsResult = await payload.find({
    collection: 'commission-payments',
    where: {
      and: [
        { seller: { equals: sellerId } },
        { owner: { equals: ownerId } },
        { date: { greater_than_equal: from } },
        { date: { less_than: to } },
      ],
    },
    depth: 0,
    limit: 10000,
    overrideAccess: true,
  });

  let periodPayments = 0;
  for (const payment of periodPaymentsResult.docs) {
    periodPayments += payment.amount as number;
  }

  return { totalCommission, totalPaid, pendingBalance, periodSales, periodCommission, periodPayments };
}

export async function getCommissionPayments(
  sellerId: number,
  ownerId: number,
  period?: { year: number; month: number },
): Promise<CommissionPaymentRow[]> {
  const payload = await getPayloadClient();

  const p = period ?? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  const { from, to } = getMonthRange(p.year, p.month);

  const result = await payload.find({
    collection: 'commission-payments',
    where: {
      and: [
        { seller: { equals: sellerId } },
        { owner: { equals: ownerId } },
        { date: { greater_than_equal: from } },
        { date: { less_than: to } },
      ],
    },
    sort: '-date',
    depth: 0,
    limit: 500,
    overrideAccess: true,
  });

  return result.docs.map((payment) => ({
    id: payment.id,
    amount: payment.amount as number,
    date: payment.date as string,
    paymentMethod: payment.paymentMethod as 'transfer' | 'cash' | 'check',
    reference: (payment.reference as string) ?? null,
    notes: (payment.notes as string) ?? null,
    createdAt: payment.createdAt,
  }));
}

export async function getSellersCommissionSummaries(ownerId: number): Promise<Map<number, CommissionSummary>> {
  const payload = await getPayloadClient();

  const salesResult = await payload.find({
    collection: 'sales',
    where: { owner: { equals: ownerId } },
    depth: 0,
    limit: 10000,
    overrideAccess: true,
  });

  const commissionBySeller = new Map<number, { totalCommission: number }>();

  for (const sale of salesResult.docs as Sale[]) {
    const sellerId = resolveId(sale.seller) ?? 0;
    if (sellerId === 0) continue;

    const existing = commissionBySeller.get(sellerId) ?? { totalCommission: 0 };
    existing.totalCommission += sale.total * COMMISSION_RATE;
    commissionBySeller.set(sellerId, existing);
  }

  const paymentsResult = await payload.find({
    collection: 'commission-payments',
    where: { owner: { equals: ownerId } },
    depth: 0,
    limit: 10000,
    overrideAccess: true,
  });

  const paidBySeller = new Map<number, number>();
  for (const payment of paymentsResult.docs) {
    const sellerId = resolveId(payment.seller) ?? 0;
    if (sellerId === 0) continue;
    const current = paidBySeller.get(sellerId) ?? 0;
    paidBySeller.set(sellerId, current + (payment.amount as number));
  }

  const summaries = new Map<number, CommissionSummary>();

  for (const [sellerId, data] of commissionBySeller) {
    const totalPaid = paidBySeller.get(sellerId) ?? 0;
    summaries.set(sellerId, {
      totalCommission: data.totalCommission,
      totalPaid,
      pendingBalance: Math.max(0, data.totalCommission - totalPaid),
      periodSales: 0,
      periodCommission: 0,
      periodPayments: 0,
    });
  }

  return summaries;
}

export async function createCommissionPayment(
  sellerId: number,
  ownerId: number,
  data: {
    amount: number;
    date: string;
    paymentMethod: 'transfer' | 'cash' | 'check';
    reference?: string;
    notes?: string;
  },
): Promise<void> {
  const payload = await getPayloadClient();

  await payload.create({
    collection: 'commission-payments',
    data: {
      seller: sellerId,
      owner: ownerId,
      amount: data.amount,
      date: data.date,
      paymentMethod: data.paymentMethod,
      ...(data.reference ? { reference: data.reference } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
    },
    overrideAccess: true,
  });

  revalidateTag('seller-dashboard');
  revalidateTag('owner-dashboard');
}
