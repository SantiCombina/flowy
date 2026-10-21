import type { CollectionConfig } from 'payload';

import { isCalendarDate } from '@/lib/tenant-payment-values';
import { tenantPaymentSchema } from '@/schemas/backoffice/tenant-payment-schema';

function relationshipId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (value && typeof value === 'object' && 'id' in value) return relationshipId(value.id);
  return null;
}

function calendarDate(value: unknown): string {
  if (typeof value !== 'string') return '';
  const day = value.slice(0, 10);
  if (!isCalendarDate(day)) return '';
  if (value !== day && (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== day)) return '';
  return day;
}

export const TenantPlanPayments: CollectionConfig = {
  slug: 'tenant-plan-payments',
  labels: { singular: 'Pago de plan', plural: 'Pagos de planes' },
  admin: { useAsTitle: 'planLabel', defaultColumns: ['tenant', 'planLabel', 'paidAt', 'amount', 'currency'] },
  access: {
    create: ({ req }) => req.user?.role === 'admin',
    read: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    beforeValidate: [async ({ data, originalDoc, req, operation }) => {
      if (req.user?.role !== 'admin') throw new Error('No autorizado');
      if (!data) throw new Error('El pago no es válido');
      const merged = { ...originalDoc, ...data };
      const tenantId = relationshipId(merged.tenant);
      if (!tenantId || operation === 'update' && tenantId !== relationshipId(originalDoc?.tenant)) throw new Error('No se puede cambiar el tenant del pago');
      const owner = await req.payload.findByID({ collection: 'users', id: tenantId, depth: 0, overrideAccess: true, req });
      if (owner.role !== 'owner' || owner.isDeleted) throw new Error('Tenant no encontrado');
      const planId = relationshipId(merged.planVersion);
      if (merged.planVersion != null && !planId) throw new Error('El plan no es válido');
      const parsed = tenantPaymentSchema.safeParse({
        ownerId: tenantId,
        planSelection: planId ? String(planId) : 'custom',
        periodStart: calendarDate(merged.periodStart), periodEnd: calendarDate(merged.periodEnd), paidAt: calendarDate(merged.paidAt),
        paymentMethod: merged.paymentMethod, amount: merged.amount, currency: merged.currency,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'El pago no es válido');
      const planChanged = operation === 'create' || planId !== relationshipId(originalDoc?.planVersion);
      let planLabel = originalDoc?.planLabel;
      if (planChanged) {
        if (planId) {
          const plan = await req.payload.findByID({ collection: 'plan-versions', id: planId, depth: 0, overrideAccess: true, req });
          if (new Date(plan.publishedAt).getTime() > Date.now()) throw new Error('El plan aún no está publicado');
          planLabel = `${plan.planCode.charAt(0).toUpperCase()}${plan.planCode.slice(1)} · v${plan.version}`;
        } else {
          planLabel = 'Personalizado';
        }
      }
      return {
        ...data, tenant: tenantId, planVersion: planId, planLabel,
        amount: Math.round(parsed.data.amount * 100) / 100,
        periodStart: `${parsed.data.periodStart}T12:00:00.000Z`, periodEnd: `${parsed.data.periodEnd}T12:00:00.000Z`, paidAt: `${parsed.data.paidAt}T12:00:00.000Z`,
        registeredBy: operation === 'create' ? req.user.id : relationshipId(originalDoc?.registeredBy), updatedBy: req.user.id,
      };
    }],
    beforeDelete: [({ req }) => { if (req.user?.role !== 'admin') throw new Error('No autorizado'); }],
  },
  fields: [
    { name: 'tenant', type: 'relationship', relationTo: 'users', required: true, index: true, filterOptions: { role: { equals: 'owner' } }, admin: { readOnly: true } },
    { name: 'planVersion', type: 'relationship', relationTo: 'plan-versions', label: 'Versión de plan', admin: { description: 'Dejar vacío para un plan personalizado.' } },
    { name: 'planLabel', type: 'text', required: true, maxLength: 120, label: 'Plan registrado', admin: { readOnly: true } },
    { name: 'periodStart', type: 'date', required: true, label: 'Período desde', admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'periodEnd', type: 'date', required: true, label: 'Período hasta', admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'paidAt', type: 'date', required: true, index: true, label: 'Fecha de pago', admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'paymentMethod', type: 'select', required: true, options: [{ label: 'Efectivo', value: 'cash' }, { label: 'Transferencia', value: 'transfer' }], label: 'Método' },
    { name: 'amount', type: 'number', required: true, min: 0.01, max: 999999999.99, label: 'Monto' },
    { name: 'currency', type: 'select', required: true, options: [{ label: 'Pesos argentinos (ARS)', value: 'ARS' }, { label: 'Dólares (USD)', value: 'USD' }], label: 'Moneda' },
    { name: 'registeredBy', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true }, label: 'Registrado por' },
    { name: 'updatedBy', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true }, label: 'Actualizado por' },
  ],
  timestamps: true,
};
