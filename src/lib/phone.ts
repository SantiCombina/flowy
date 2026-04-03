import { AsYouType, isValidPhoneNumber } from 'libphonenumber-js';
import { z } from 'zod';

export function formatPhoneInput(value: string): string {
  return new AsYouType('AR').input(value);
}

export const phoneSchema = z
  .string({ invalid_type_error: 'El teléfono debe ser una cadena de texto.' })
  .trim()
  .refine((val) => isValidPhoneNumber(val, 'AR'), {
    message: 'Número de teléfono inválido.',
  });
