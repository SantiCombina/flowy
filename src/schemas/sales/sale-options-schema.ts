import { z } from 'zod';

export const saleOptionsSchema = z
  .object({
    forceRefresh: z
      .boolean({
        required_error: 'Indicá si querés recargar el stock',
        invalid_type_error: 'La opción de recarga debe ser verdadera o falsa',
      })
      .optional(),
  })
  .optional();

export type SaleOptionsValues = z.infer<typeof saleOptionsSchema>;
