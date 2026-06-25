import { render } from '@react-email/components';

import { ContactEmail } from '@/emails/contact-email';
import { resend } from '@/lib/resend';
import { contactSchema } from '@/schemas/contact/contact-schema';
import type { ContactValues } from '@/schemas/contact/contact-schema';

export async function sendContactEmail(data: ContactValues) {
  const parsed = contactSchema.parse(data);

  const notificationEmail = process.env.NOTIFICATION_EMAIL;

  if (!notificationEmail) {
    throw new Error('NOTIFICATION_EMAIL no está configurada');
  }

  const html = await render(
    ContactEmail({
      name: parsed.name,
      email: parsed.email,
      business: parsed.business,
      message: parsed.message,
    }),
  );

  const { error } = await resend.emails.send({
    from: `Flowy <${process.env.EMAIL_FROM ?? 'noreply@flowy.ar'}>`,
    to: notificationEmail,
    replyTo: parsed.email,
    subject: `Nuevo contacto de ${parsed.name} desde Flowy`,
    html,
  });

  if (error) {
    throw new Error(error.message ?? 'Error al enviar el email');
  }

  return { success: true };
}
