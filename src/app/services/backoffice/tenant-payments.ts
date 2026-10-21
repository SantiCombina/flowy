'use server';

import type { Where } from 'payload';

import { getPayloadClient } from '@/lib/payload';
import type { TenantPlanPayment, User } from '@/payload-types';
import type { TenantPaymentListValues, TenantPaymentValues } from '@/schemas/backoffice/tenant-payment-schema';

export interface TenantPaymentRow {
  id: number;
  planVersionId: number | null;
  planLabel: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string;
  paymentMethod: TenantPlanPayment['paymentMethod'];
  amount: number;
  currency: TenantPlanPayment['currency'];
  registeredByName: string;
}

export interface TenantPaymentHistory {
  docs: TenantPaymentRow[];
  totalDocs: number;
  totalPages: number;
  page: number;
  plans: { value: string; label: string }[];
}

export async function getTenantPaymentHistory(ownerId: number, filters: TenantPaymentListValues): Promise<TenantPaymentHistory> {
  const payload = await getPayloadClient();
  const conditions: Where[] = [{ tenant: { equals: ownerId } }];
  if (filters.search) conditions.push({ planLabel: { like: filters.search } });
  if (filters.currency !== 'all') conditions.push({ currency: { equals: filters.currency } });
  if (filters.method !== 'all') conditions.push({ paymentMethod: { equals: filters.method } });
  const query = {
    collection: 'tenant-plan-payments', where: { and: conditions }, sort: ['-paidAt', '-id'], limit: 10, depth: 1, overrideAccess: true,
  } satisfies Parameters<typeof payload.find<'tenant-plan-payments'>>[0];
  const [initial, plans] = await Promise.all([
    payload.find({ ...query, page: filters.page }),
    payload.find({ collection: 'plan-versions', where: { publishedAt: { less_than_equal: new Date().toISOString() } }, sort: ['planCode', '-version'], pagination: false, depth: 0, overrideAccess: true }),
  ]);
  const totalPages = Math.max(1, initial.totalPages);
  const page = Math.min(filters.page, totalPages);
  const result = page === filters.page ? initial : await payload.find({ ...query, page });
  return {
    docs: result.docs.map((payment) => ({
      id: payment.id,
      planVersionId: typeof payment.planVersion === 'number' ? payment.planVersion : payment.planVersion?.id ?? null,
      planLabel: payment.planLabel, periodStart: payment.periodStart, periodEnd: payment.periodEnd, paidAt: payment.paidAt,
      paymentMethod: payment.paymentMethod, amount: payment.amount, currency: payment.currency,
      registeredByName: typeof payment.registeredBy === 'object' ? payment.registeredBy.name : 'Admin',
    })),
    totalDocs: result.totalDocs, totalPages, page,
    plans: [...plans.docs.map((plan) => ({ value: String(plan.id), label: `${plan.planCode.charAt(0).toUpperCase()}${plan.planCode.slice(1)} · v${plan.version}` })), { value: 'custom', label: 'Personalizado' }],
  };
}

export async function saveTenantPayment(ownerId: number, values: TenantPaymentValues, admin: User): Promise<void> {
  const payload = await getPayloadClient();
  const data = {
    planVersion: values.planSelection === 'custom' ? null : Number(values.planSelection),
    periodStart: `${values.periodStart}T12:00:00.000Z`, periodEnd: `${values.periodEnd}T12:00:00.000Z`, paidAt: `${values.paidAt}T12:00:00.000Z`,
    paymentMethod: values.paymentMethod, amount: values.amount, currency: values.currency,
  };
  if (values.paymentId) {
    const result = await payload.update({
      collection: 'tenant-plan-payments', where: { and: [{ id: { equals: values.paymentId } }, { tenant: { equals: ownerId } }] },
      data, user: admin, overrideAccess: true,
    });
    if (result.errors.length || !result.docs.length) throw new Error('No se pudo actualizar el pago de este tenant');
    return;
  }
  await payload.create({
    collection: 'tenant-plan-payments',
    data: { ...data, tenant: ownerId, planLabel: 'Personalizado', registeredBy: admin.id, updatedBy: admin.id },
    user: admin, overrideAccess: true,
  });
}

export async function deleteTenantPayment(ownerId: number, paymentId: number, admin: User): Promise<void> {
  const payload = await getPayloadClient();
  const result = await payload.delete({
    collection: 'tenant-plan-payments', where: { and: [{ id: { equals: paymentId } }, { tenant: { equals: ownerId } }] }, user: admin, overrideAccess: true,
  });
  if (result.errors.length || !result.docs.length) throw new Error('No se pudo eliminar el pago de este tenant');
}
