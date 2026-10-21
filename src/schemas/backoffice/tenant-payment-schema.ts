import { z } from 'zod';

import { hasAtMostTwoDecimals, isCalendarDate, MAX_TENANT_PAYMENT_AMOUNT } from '@/lib/tenant-payment-values';

const id = z.number({ required_error: 'El identificador es obligatorio.', invalid_type_error: 'El identificador no es válido.' }).int().positive();
const date = z.string({ required_error: 'La fecha es obligatoria.', invalid_type_error: 'La fecha no es válida.' }).trim().max(10, 'La fecha no es válida.').refine(isCalendarDate, 'Ingresá una fecha válida.');

export const tenantPaymentFieldsSchema = z.object({
  ownerId: id,
  paymentId: id.optional(),
  planSelection: z.string({ required_error: 'El plan es obligatorio.', invalid_type_error: 'El plan no es válido.' }).trim().max(30, 'El plan no es válido.').refine((value) => value === 'custom' || /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)), 'Seleccioná un plan.'),
  periodStart: date,
  periodEnd: date,
  paidAt: date,
  paymentMethod: z.enum(['cash', 'transfer'], { required_error: 'El método es obligatorio.', invalid_type_error: 'El método no es válido.' }),
  amount: z.number({ required_error: 'El monto es obligatorio.', invalid_type_error: 'Ingresá un monto válido.' }).finite().min(0.01, 'El monto debe ser de al menos 0,01.').max(MAX_TENANT_PAYMENT_AMOUNT, 'El monto excede el máximo permitido.').refine(hasAtMostTwoDecimals, 'El monto admite hasta dos decimales.'),
  currency: z.enum(['ARS', 'USD'], { required_error: 'La moneda es obligatoria.', invalid_type_error: 'La moneda no es válida.' }),
});

export const tenantPaymentSchema = tenantPaymentFieldsSchema.refine((value) => value.periodEnd >= value.periodStart, { message: 'La fecha final no puede ser anterior a la inicial.', path: ['periodEnd'] });
export const deleteTenantPaymentSchema = z.object({ ownerId: id, paymentId: id });
export const tenantPaymentListSchema = z.object({
  page: z.coerce.number({ required_error: 'La página es obligatoria.', invalid_type_error: 'La página no es válida.' }).int().min(1).max(1000000).catch(1),
  search: z.string({ required_error: 'La búsqueda es obligatoria.', invalid_type_error: 'La búsqueda no es válida.' }).trim().max(100).catch(''),
  currency: z.enum(['all', 'ARS', 'USD'], { required_error: 'La moneda es obligatoria.', invalid_type_error: 'La moneda no es válida.' }).catch('all'),
  method: z.enum(['all', 'cash', 'transfer'], { required_error: 'El método es obligatorio.', invalid_type_error: 'El método no es válido.' }).catch('all'),
});

export type TenantPaymentValues = z.infer<typeof tenantPaymentSchema>;
export type TenantPaymentListValues = z.infer<typeof tenantPaymentListSchema>;
