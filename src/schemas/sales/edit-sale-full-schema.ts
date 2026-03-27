import { z } from 'zod';

import { saleSchema } from './sale-schema';

export const editSaleFullSchema = saleSchema.and(
  z.object({
    saleId: z.number({
      required_error: 'ID de venta requerido',
      invalid_type_error: 'ID de venta inválido',
    }),
  }),
);

export type EditSaleFullValues = z.infer<typeof editSaleFullSchema>;
