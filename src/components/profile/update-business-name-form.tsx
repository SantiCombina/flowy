'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updateBusinessNameSchema, type UpdateBusinessNameValues } from '@/schemas/profile/update-business-name-schema';

import { updateBusinessNameAction } from './actions';

interface UpdateBusinessNameFormProps {
  initialValue?: string | null;
}

export function UpdateBusinessNameForm({ initialValue }: UpdateBusinessNameFormProps) {
  const { executeAsync, isExecuting } = useAction(updateBusinessNameAction);

  const form = useForm<UpdateBusinessNameValues>({
    resolver: zodResolver(updateBusinessNameSchema),
    defaultValues: {
      businessName: initialValue ?? '',
    },
  });

  async function onSubmit(data: UpdateBusinessNameValues) {
    const result = await executeAsync(data);

    if (!result || result.serverError) {
      toast.error(result?.serverError ?? 'Error al guardar. Intentá de nuevo.');
      return;
    }

    if (result.data?.success) {
      toast.success('Nombre del negocio actualizado correctamente.');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del negocio</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Distribuidora Pérez" {...field} />
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
