'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { CAPABILITIES } from '@/lib/entitlements/capabilities';
import { queryKeys } from '@/lib/query-keys';
import { publishAdminPlanSchema, type PublishAdminPlanValues } from '@/schemas/entitlements/admin-plan-schema';

import { publishPlanAction } from './actions';

const PLAN_LABEL: Record<PublishAdminPlanValues['planCode'], string> = {
  basic: 'Basic',
  medium: 'Medium',
  professional: 'Professional',
};

const DEFAULT_VALUES: PublishAdminPlanValues = {
  planCode: 'basic',
  capabilities: [],
  quotas: {
    maxSellerSeats: 0,
    maxProducts: 0,
    maxVariantsPerProduct: 0,
    maxVariantsPerTenant: 0,
  },
};

export function PublishPlanDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { invalidateQueries } = useInvalidateQueries();

  const form = useForm<PublishAdminPlanValues>({
    resolver: zodResolver(publishAdminPlanSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { executeAsync, isExecuting } = useAction(publishPlanAction);

  function resetDialog() {
    form.reset(DEFAULT_VALUES);
  }

  async function onSubmit(data: PublishAdminPlanValues) {
    try {
      const result = await executeAsync(data);

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      if (result?.data?.success) {
        toast.success('Versión publicada');
        invalidateQueries([queryKeys.adminBackoffice.plans.list()]);
        router.refresh();
        resetDialog();
        setOpen(false);
      }
    } catch {
      toast.error('No se pudo publicar la versión. Intentá de nuevo.');
    }
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      resetDialog();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Publicar nueva versión
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogHeader>
              <DialogTitle>Publicar nueva versión de plan</DialogTitle>
              <DialogDescription>
                La versión se numera automáticamente y no podrá editarse después de publicarse.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <FieldGroup>
                <FormField
                  control={form.control}
                  name="planCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(PLAN_LABEL) as Array<keyof typeof PLAN_LABEL>).map((key) => (
                            <SelectItem key={key} value={key}>
                              {PLAN_LABEL[key]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quotas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuotas</FormLabel>
                      <FieldDescription>Definí los límites máximos para esta versión del plan.</FieldDescription>
                      <QuotaGrid field={field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capabilities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacidades</FormLabel>
                      <FieldDescription>
                        Seleccioná las capacidades que estarán habilitadas en esta versión.
                      </FieldDescription>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {CAPABILITIES.map((capability) => (
                          <CapabilitiesCheckbox
                            key={capability}
                            capability={capability}
                            checked={field.value.includes(capability)}
                            onChange={(next) => field.onChange(next)}
                            currentValue={field.value}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldGroup>
            </div>

            <DialogFooter className="px-6 pb-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isExecuting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isExecuting}>
                {isExecuting ? (
                  <span className="flex items-center gap-2">
                    Publicando
                    <Spinner />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 />
                    Publicar
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface QuotaGridProps {
  field: {
    value: PublishAdminPlanValues['quotas'];
    onChange: (value: PublishAdminPlanValues['quotas']) => void;
  };
}

const QUOTA_FIELDS: ReadonlyArray<{
  key: 'maxSellerSeats' | 'maxProducts' | 'maxVariantsPerProduct' | 'maxVariantsPerTenant';
  label: string;
  description: string;
}> = [
  { key: 'maxSellerSeats', label: 'Vendedores', description: 'Asientos máximos por tenant' },
  { key: 'maxProducts', label: 'Productos', description: 'Productos máximos del catálogo' },
  {
    key: 'maxVariantsPerProduct',
    label: 'Variantes por producto',
    description: 'Variantes máximas por producto',
  },
  {
    key: 'maxVariantsPerTenant',
    label: 'Variantes totales',
    description: 'Variantes máximas en el tenant',
  },
];

function QuotaGrid({ field }: QuotaGridProps) {
  const ctx = useFormContext();
  const error = ctx.formState.errors.quotas;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {QUOTA_FIELDS.map((entry) => (
        <Field key={entry.key} data-invalid={error ? 'true' : undefined}>
          <FieldLabel htmlFor={`quota-${entry.key}`}>{entry.label}</FieldLabel>
          <FieldDescription>{entry.description}</FieldDescription>
          <Input
            id={`quota-${entry.key}`}
            type="number"
            min={0}
            inputMode="numeric"
            value={field.value[entry.key]}
            onChange={(event) => {
              const parsed = Number.parseInt(event.currentTarget.value, 10);
              field.onChange({
                ...field.value,
                [entry.key]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
              });
            }}
          />
        </Field>
      ))}
    </div>
  );
}

interface CapabilitiesCheckboxProps {
  capability: (typeof CAPABILITIES)[number];
  checked: boolean;
  currentValue: (typeof CAPABILITIES)[number][];
  onChange: (next: (typeof CAPABILITIES)[number][]) => void;
}

function CapabilitiesCheckbox({ capability, checked, currentValue, onChange }: CapabilitiesCheckboxProps) {
  return (
    <Field orientation="horizontal" className="rounded-lg border bg-card p-2.5">
      <Checkbox
        id={`cap-${capability}`}
        checked={checked}
        onCheckedChange={(value) => {
          if (value === true) {
            onChange([...currentValue, capability]);
          } else {
            onChange(currentValue.filter((item) => item !== capability));
          }
        }}
      />
      <FieldLabel htmlFor={`cap-${capability}`} className="cursor-pointer text-xs font-normal">
        {capability}
      </FieldLabel>
    </Field>
  );
}
