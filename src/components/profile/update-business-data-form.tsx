'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPhoneInput } from '@/lib/phone';
import { updateBusinessDataSchema, type UpdateBusinessDataValues } from '@/schemas/profile/update-business-data-schema';

import { updateBusinessDataAction } from './actions';

function formatBusinessCuit(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

interface UpdateBusinessDataFormProps {
  businessCuit?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  ivaCondition?: string | null;
}

export function UpdateBusinessDataForm({
  businessCuit,
  businessPhone,
  businessAddress,
  ivaCondition,
}: UpdateBusinessDataFormProps) {
  const { executeAsync, isExecuting } = useAction(updateBusinessDataAction);

  const form = useForm<UpdateBusinessDataValues>({
    resolver: zodResolver(updateBusinessDataSchema),
    defaultValues: {
      businessCuit: businessCuit ?? '',
      businessPhone: businessPhone ?? '',
      businessAddress: businessAddress ?? '',
      ivaCondition: (ivaCondition as UpdateBusinessDataValues['ivaCondition']) ?? undefined,
    },
  });

  async function onSubmit(data: UpdateBusinessDataValues) {
    const result = await executeAsync(data);

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Datos fiscales actualizados correctamente.');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="businessCuit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CUIT empresa</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  placeholder="20-12345678-9"
                  {...field}
                  onChange={(e) => field.onChange(formatBusinessCuit(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="businessPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono comercial</FormLabel>
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
          name="businessAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domicilio fiscal</FormLabel>
              <FormControl>
                <Input placeholder="Av. Corrientes 1234, CABA" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ivaCondition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condición IVA</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná una condición" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="responsable_inscripto">Responsable Inscripto</SelectItem>
                  <SelectItem value="monotributista">Monotributista</SelectItem>
                  <SelectItem value="exento">Exento</SelectItem>
                  <SelectItem value="no_responsable">No Responsable</SelectItem>
                </SelectContent>
              </Select>
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
