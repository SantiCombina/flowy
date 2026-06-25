'use server';

import { sendContactEmail } from '@/app/services/contact';
import { actionClient } from '@/lib/safe-action';
import { contactSchema } from '@/schemas/contact/contact-schema';

export const sendContactAction = actionClient.schema(contactSchema).action(async ({ parsedInput }) => {
  await sendContactEmail(parsedInput);
  return { success: true };
});
