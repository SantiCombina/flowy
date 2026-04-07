'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { formatPhoneInput } from '@/lib/phone';
import { updateProfileSchema, type UpdateProfileValues } from '@/schemas/profile/update-profile-schema';

import { updateProfileAction } from './actions';

function formatCuitCuil(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

function formatDni(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

interface UpdateProfileFormProps {
  phone?: string | null;
  dni?: string | null;
  cuitCuil?: string | null;
  cbu?: string | null;
}

export function UpdateProfileForm({ phone, dni, cuitCuil, cbu }: UpdateProfileFormProps) {
  const { executeAsync, isExecuting } = useAction(updateProfileAction);

  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      phone: phone ?? '',
      dni: dni ?? '',
      cuitCuil: cuitCuil ?? '',
      cbu: cbu ?? '',
    },
  });

  async function onSubmit(data: UpdateProfileValues) {
    const result = await executeAsync(data);

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Datos actualizados correctamente.');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input
                  inputMode="tel"
                  placeholder="+54 9 11 1234-5678"
                  {...field}
                  onChange={(e) => field.onChange(formatPhoneInput(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dni"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DNI</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  placeholder="12345678"
                  {...field}
                  onChange={(e) => field.onChange(formatDni(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cuitCuil"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CUIT/CUIL</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  placeholder="20-12345678-9"
                  {...field}
                  onChange={(e) => field.onChange(formatCuitCuil(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cbu"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CBU/Alias</FormLabel>
              <FormControl>
                <Input placeholder="alias.banco" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isExecuting} className="ml-auto block">
          {isExecuting ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </form>
    </Form>
  );
}
