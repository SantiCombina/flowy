'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';

import type { PlanVersionSummary } from '@/app/services/backoffice/plans';
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
import { CAPABILITIES, getCapabilityLabel, groupCapabilitiesByDomain } from '@/lib/entitlements/capabilities';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
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

function buildDefaultValues(initialVersion?: PlanVersionSummary): PublishAdminPlanValues {
  if (!initialVersion) return DEFAULT_VALUES;
  return {
    planCode: initialVersion.planCode,
    capabilities: [...initialVersion.capabilities],
    quotas: { ...initialVersion.quotas },
  };
}

interface PublishPlanDialogProps {
  initialVersion?: PlanVersionSummary;
}

export function PublishPlanDialog({ initialVersion }: PublishPlanDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { invalidateQueries } = useInvalidateQueries();

  const form = useForm<PublishAdminPlanValues>({
    resolver: zodResolver(publishAdminPlanSchema),
    defaultValues: buildDefaultValues(initialVersion),
  });

  const { executeAsync, isExecuting } = useAction(publishPlanAction);
  const isEditMode = initialVersion !== undefined;

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(initialVersion));
    }
  }, [open, initialVersion, form]);

  async function onSubmit(data: PublishAdminPlanValues) {
    try {
      const result = await executeAsync(data);

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      if (result?.data?.success) {
        const migrated = result.data.migratedTenantsCount ?? 0;
        if (migrated > 0) {
          toast.success(`Plan actualizado · ${migrated} tenants migrados`);
        } else {
          toast.success('Versión publicada');
        }
        invalidateQueries([queryKeys.adminBackoffice.plans.list()]);
        router.refresh();
        setOpen(false);
      }
    } catch {
      toast.error('No se pudo publicar la versión. Intentá de nuevo.');
    }
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      form.reset(buildDefaultValues(initialVersion));
    }
  }

  const dialogTitle = isEditMode
    ? `Editar Plan ${PLAN_LABEL[initialVersion.planCode]}`
    : 'Publicar nueva versión de plan';

  const dialogDescription = isEditMode
    ? 'Los cambios generan una nueva versión del plan y se aplican a todos los tenants activos.'
    : 'La versión se numera automáticamente y no podrá editarse después de publicarse.';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEditMode ? (
          <Button variant="outline" size="sm">
            <Pencil />
            Editar
          </Button>
        ) : (
          <Button>
            <Plus />
            Publicar nueva versión
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <FieldGroup>
                <FormField
                  control={form.control}
                  name="planCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      {isEditMode ? (
                        <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                          {PLAN_LABEL[field.value]}
                        </div>
                      ) : (
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
                      )}
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
                      <CapabilitiesGroupedList checkedValues={field.value} onChange={field.onChange} />
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
                    Guardando
                    <Spinner />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 />
                    {isEditMode ? 'Guardar cambios' : 'Publicar'}
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
  {
    key: 'maxSellerSeats',
    label: 'Vendedores',
    description: 'Asientos máximos por tenant',
  },
  {
    key: 'maxProducts',
    label: 'Productos',
    description: 'Productos máximos del catálogo',
  },
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

interface CapabilitiesGroupedListProps {
  checkedValues: PublishAdminPlanValues['capabilities'];
  onChange: (next: PublishAdminPlanValues['capabilities']) => void;
}

function CapabilitiesGroupedList({ checkedValues, onChange }: CapabilitiesGroupedListProps) {
  const grouped = groupCapabilitiesByDomain(CAPABILITIES);

  function toggle(capability: (typeof CAPABILITIES)[number], value: boolean) {
    if (value) {
      onChange([...checkedValues, capability]);
    } else {
      onChange(checkedValues.filter((item) => item !== capability));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {grouped.map((group) => (
        <div key={group.group} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((meta) => {
              const checked = checkedValues.includes(meta.key);
              return (
                <Field
                  key={meta.key}
                  orientation="horizontal"
                  className={cn(
                    'items-start rounded-lg border bg-card p-2.5',
                    checked && 'border-primary/40 bg-primary/5',
                  )}
                >
                  <Checkbox
                    id={`cap-${meta.key}`}
                    checked={checked}
                    onCheckedChange={(value) => toggle(meta.key, value === true)}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel
                      htmlFor={`cap-${meta.key}`}
                      className="cursor-pointer text-xs font-medium leading-tight"
                    >
                      {getCapabilityLabel(meta.key)}
                    </FieldLabel>
                    <p className="text-[11px] text-muted-foreground leading-snug">{meta.description}</p>
                  </div>
                </Field>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
