'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { assignOrChangeTenantPlan, publishPlanVersion } from '@/app/services/entitlements';
import { getCurrentUser, getPayloadClient } from '@/lib/payload';
import { changeTenantPlanSchema, publishAdminPlanSchema } from '@/schemas/entitlements/admin-plan-schema';

export async function publishPlanVersionFromAdmin(formData: FormData): Promise<void> {
  try {
    const user = await requireAdmin();
    const input = publishAdminPlanSchema.parse({
      planCode: formData.get('planCode'),
      capabilities: formData.getAll('capabilities'),
      quotas: {
        maxSellerSeats: formData.get('maxSellerSeats'),
        maxProducts: formData.get('maxProducts'),
        maxVariantsPerProduct: formData.get('maxVariantsPerProduct'),
        maxVariantsPerTenant: formData.get('maxVariantsPerTenant'),
      },
    });

    await publishPlanVersion(
      input.planCode,
      input.capabilities.map((capability) => ({ capability })),
      input.quotas,
      user.id,
    );
  } catch (error) {
    redirectWithError(error);
  }

  revalidatePath('/admin');
  redirect('/admin?plansStatus=published');
}

export async function changeTenantPlanFromAdmin(formData: FormData): Promise<void> {
  try {
    const user = await requireAdmin();
    const { tenantId, planVersionId } = changeTenantPlanSchema.parse({
      tenantId: formData.get('tenantId'),
      planVersionId: formData.get('planVersionId'),
    });

    const payload = await getPayloadClient();
    const tenant = await payload.findByID({
      collection: 'users',
      id: tenantId,
      overrideAccess: true,
    });

    if (tenant.role !== 'owner') {
      throw new Error('El tenant seleccionado no es un owner');
    }
    if (tenant.entitlementState === 'blocked') {
      throw new Error('El tenant está bloqueado');
    }

    await assignOrChangeTenantPlan(tenantId, planVersionId, user.id);
  } catch (error) {
    redirectWithError(error);
  }

  revalidatePath('/admin');
  redirect('/admin?plansStatus=assigned');
}

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  return user;
}

function redirectWithError(error: unknown): never {
  const message = error instanceof Error ? error.message : 'No se pudo completar la operación';
  redirect(`/admin?plansError=${encodeURIComponent(message)}`);
}
