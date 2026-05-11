import { z } from 'zod';

export const getInventorySchema = z.object({
  sellerId: z.number(),
});
