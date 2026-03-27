import { z } from 'zod';

export const deleteSaleSchema = z.object({
  saleId: z.number({
    required_error: 'ID de venta requerido',
    invalid_type_error: 'ID de venta inválido',
  }),
});

export type DeleteSaleValues = z.infer<typeof deleteSaleSchema>;
