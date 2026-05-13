'use server';

import { revalidateTag, unstable_cache } from 'next/cache';
import type { Where } from 'payload';

import { notifyEvent } from '@/lib/notify';
import { getPayloadClient } from '@/lib/payload';
import { resolveId } from '@/lib/payload-utils';
import { formatCurrency } from '@/lib/utils';
import type { Sale } from '@/payload-types';
import type { SaleValues } from '@/schemas/sales/sale-schema';

export interface MonthlyDemand {
  month: string;
  units: number;
  revenue: number;
}

export interface MonthSummary {
  units: number;
  revenue: number;
}

export interface VariantSalesHistory {
  variantId: number;
  lastSoldAt: string | null;
  totalUnits: number;
  totalRevenue: number;
  monthly: MonthlyDemand[];
  currentMonth: MonthSummary;
  previousMonth: MonthSummary;
}

export interface VariantDemandSummary {
  lastSoldAt: string | null;
  totalUnits: number;
}

export interface SaleVariantOption {
  variantId: number;
  productName: string;
  brandName?: string;
  presentationLabel?: string;
  code?: string;
  price: number;
  warehouseStock: number;
  personalStock: number;
}

export interface SaleClientOption {
  id: number;
  name: string;
}

export interface SaleOptions {
  variants: SaleVariantOption[];
  clients: SaleClientOption[];
}

export interface SaleItemDetail {
  variantId: number;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  stockSource: 'warehouse' | 'personal';
}

export interface SaleRow {
  id: number;
  date: string;
  sellerId: number;
  sellerName: string;
  clientId?: number;
  clientName?: string;
  clientZoneId?: number;
  clientZoneName?: string;
  notes?: string;
  itemCount: number;
  total: number;
  paymentMethod: 'cash' | 'transfer' | 'check' | null;
  paymentStatus: 'pending' | 'partially_collected' | 'collected';
  amountPaid: number;
  collectedAt?: string;
  checkDueDate?: string;
  ownerPaymentStatus: 'pending' | 'partially_collected' | 'collected';
  ownerAmountPaid: number;
  ownerCollectedAt?: string;
  deliveryStatus: 'pending' | 'delivered';
  deliveredAt?: string;
  items: SaleItemDetail[];
}

export async function getSaleOptions(sellerId: number, ownerId: number): Promise<SaleOptions> {
  const payload = await getPayloadClient();

  const [variantsResult, inventoryResult, clientsResult] = await Promise.all([
    payload.find({
      collection: 'product-variants',
      where: { owner: { equals: ownerId } },
      depth: 2,
      limit: 1000,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'mobile-seller-inventory',
      where: {
        and: [{ seller: { equals: sellerId } }, { owner: { equals: ownerId } }],
      },
      limit: 1000,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'clients',
      where: { owner: { equals: ownerId } },
      sort: 'name',
      limit: 1000,
      overrideAccess: true,
    }),
  ]);

  const personalStockMap = new Map<number, number>();
  for (const inv of inventoryResult.docs) {
    const variantId = typeof inv.variant === 'number' ? inv.variant : inv.variant.id;
    personalStockMap.set(variantId, inv.quantity);
  }

  const variants: SaleVariantOption[] = variantsResult.docs.map((variant) => {
    const product = typeof variant.product === 'object' ? variant.product : null;
    const presentation = variant.presentation && typeof variant.presentation === 'object' ? variant.presentation : null;
    const brand = product?.brand && typeof product.brand === 'object' ? product.brand : null;

    return {
      variantId: variant.id,
      productName: product?.name ?? 'Producto desconocido',
      brandName: brand?.name ?? undefined,
      presentationLabel: presentation?.label ?? undefined,
      code: variant.code ?? undefined,
      price: variant.costPrice * (1 + (variant.profitMargin ?? 0) / 100),
      warehouseStock: variant.stock,
      personalStock: personalStockMap.get(variant.id) ?? 0,
    };
  });

  const clients: SaleClientOption[] = clientsResult.docs.map((client) => ({
    id: client.id,
    name: client.name,
  }));

  return { variants, clients };
}

export async function createSale(sellerId: number, ownerId: number, data: SaleValues): Promise<Sale> {
  const payload = await getPayloadClient();

  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) {
    throw new Error('No se pudo iniciar la transacción de base de datos');
  }

  const lowStockNotifications: Array<{
    recipientId: number;
    ownerId: number;
    type: 'stock_low';
    title: string;
    body: string;
    metadata: Record<string, unknown>;
  }> = [];

  let sale: Sale | undefined;
  let total = 0;

  try {
    const variantIds = data.items.map((item) => item.variantId);
    const variantsResult = await payload.find({
      collection: 'product-variants',
      where: { id: { in: variantIds } },
      depth: 1,
      limit: variantIds.length,
      overrideAccess: true,
      req: { transactionID },
    });
    const variantMap = new Map(variantsResult.docs.map((v) => [v.id, { ...v }]));

    const personalItems = data.items.filter((item) => item.stockSource === 'personal');
    const inventoryMap = new Map<number, { id: number; quantity: number }>();
    if (personalItems.length > 0) {
      const personalVariantIds = personalItems.map((item) => item.variantId);
      const inventoryResult = await payload.find({
        collection: 'mobile-seller-inventory',
        where: {
          and: [{ seller: { equals: sellerId } }, { variant: { in: personalVariantIds } }],
        },
        limit: personalVariantIds.length,
        overrideAccess: true,
        req: { transactionID },
      });
      for (const inv of inventoryResult.docs) {
        const variantId = typeof inv.variant === 'number' ? inv.variant : inv.variant.id;
        inventoryMap.set(variantId, { id: inv.id, quantity: inv.quantity });
      }
    }

    for (const item of data.items) {
      const variant = variantMap.get(item.variantId);
      if (!variant) throw new Error(`Variante ${item.variantId} no encontrada`);

      if (item.stockSource === 'warehouse') {
        if (variant.stock < item.quantity) {
          throw new Error(
            `Stock insuficiente en depósito para ${variant.code ?? item.variantId}. ` +
              `Disponible: ${variant.stock}, requerido: ${item.quantity}`,
          );
        }

        const previousStock = variant.stock;
        const newStock = previousStock - item.quantity;
        variant.stock = newStock;

        await payload.update({
          collection: 'product-variants',
          id: item.variantId,
          data: { stock: newStock },
          overrideAccess: true,
          req: { transactionID },
        });

        await payload.create({
          collection: 'stock-movements',
          data: {
            variant: item.variantId,
            type: 'sale',
            quantity: item.quantity,
            previousStock,
            newStock,
            owner: ownerId,
            createdBy: sellerId,
          },
          overrideAccess: true,
          req: { transactionID },
        });

        if (variant.minimumStock && variant.minimumStock > 0 && newStock > 0 && newStock <= variant.minimumStock) {
          const productName = typeof variant.product === 'object' ? variant.product.name : `Variante ${item.variantId}`;
          lowStockNotifications.push({
            recipientId: ownerId,
            ownerId,
            type: 'stock_low',
            title: 'Stock bajo',
            body: `Stock bajo: ${productName} — quedan ${newStock} unidades`,
            metadata: { variantId: item.variantId, newStock, minimumStock: variant.minimumStock },
          });
        }
      } else {
        const inventoryRecord = inventoryMap.get(item.variantId);

        if (!inventoryRecord || inventoryRecord.quantity < item.quantity) {
          throw new Error(
            `Stock insuficiente en inventario personal para ${variant.code ?? item.variantId}. ` +
              `Disponible: ${inventoryRecord?.quantity ?? 0}, requerido: ${item.quantity}`,
          );
        }

        const previousQuantity = inventoryRecord.quantity;
        const newMobileStock = previousQuantity - item.quantity;
        inventoryRecord.quantity = newMobileStock;

        await payload.update({
          collection: 'mobile-seller-inventory',
          id: inventoryRecord.id,
          data: { quantity: newMobileStock },
          overrideAccess: true,
          req: { transactionID },
        });

        await payload.create({
          collection: 'stock-movements',
          data: {
            variant: item.variantId,
            type: 'sale',
            quantity: item.quantity,
            previousStock: previousQuantity,
            newStock: newMobileStock,
            mobileSeller: sellerId,
            owner: ownerId,
            createdBy: sellerId,
          },
          overrideAccess: true,
          req: { transactionID },
        });
      }
    }

    total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const isImmediate = data.paymentMethod !== 'credit';
    const now = new Date().toISOString();

    sale = await payload.create({
      collection: 'sales',
      draft: false,
      data: {
        seller: sellerId,
        owner: ownerId,
        ...(data.clientId ? { client: data.clientId } : {}),
        date: now,
        items: data.items.map((item) => ({
          variant: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          stockSource: item.stockSource,
        })),
        total,
        amountPaid: isImmediate ? total : 0,
        paymentStatus: isImmediate ? ('collected' as const) : ('pending' as const),
        deliveryStatus: data.immediateDelivery ? ('delivered' as const) : ('pending' as const),
        ...(data.immediateDelivery ? { deliveredAt: now } : {}),
        ownerPaymentStatus: 'pending' as const,
        ownerAmountPaid: 0,
        ...(isImmediate ? { paymentMethod: data.paymentMethod as 'cash' | 'transfer' | 'check' } : {}),
        ...(isImmediate ? { collectedAt: now } : {}),
        ...(data.checkDueDate ? { checkDueDate: data.checkDueDate } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      },
      overrideAccess: true,
      req: { transactionID },
    });

    await payload.db.commitTransaction(transactionID);
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID);
    throw error;
  }

  for (const notification of lowStockNotifications) {
    await notifyEvent(notification);
  }

  const sellerUser = await payload.findByID({
    collection: 'users',
    id: sellerId,
    overrideAccess: true,
  });
  const sellerName = sellerUser?.name ?? 'Vendedor';

  await notifyEvent({
    recipientId: ownerId,
    ownerId,
    sellerId,
    type: 'sale_created',
    title: 'Nueva venta',
    body: `Nueva venta de ${sellerName} por ${formatCurrency(total)}`,
    metadata: { saleId: sale.id, total, sellerId },
  });

  try {
    revalidateTag('owner-dashboard');
    revalidateTag('seller-dashboard');
    revalidateTag('product-demand');
  } catch {
    // revalidation failure should not break the operation
  }

  return sale as Sale;
}

export async function getSales(filters: {
  sellerId?: number;
  ownerId?: number;
  dateFrom?: string;
}): Promise<SaleRow[]> {
  const payload = await getPayloadClient();

  const conditions: Where[] = [
    filters.sellerId ? { seller: { equals: filters.sellerId } } : { owner: { equals: filters.ownerId } },
  ];
  if (filters.dateFrom) conditions.push({ date: { greater_than_equal: filters.dateFrom } });
  const whereClause: Where = conditions.length === 1 ? conditions[0]! : { and: conditions };

  const result = await payload.find({
    collection: 'sales',
    where: whereClause,
    sort: '-date',
    depth: 2,
    limit: 500,
    overrideAccess: true,
  });

  return (result.docs as Sale[]).map((sale: Sale) => {
    const seller = typeof sale.seller === 'object' ? sale.seller : null;
    const sellerId = resolveId(sale.seller) ?? 0;
    const client = sale.client && typeof sale.client === 'object' ? sale.client : null;
    const clientZone = client?.zone && typeof client.zone === 'object' ? client.zone : null;

    const items: SaleItemDetail[] = sale.items.map((item) => {
      const variant = typeof item.variant === 'object' ? item.variant : null;
      const variantId = resolveId(item.variant) ?? 0;
      const product = variant && typeof variant.product === 'object' ? variant.product : null;
      const presentation =
        variant?.presentation && typeof variant.presentation === 'object' ? variant.presentation : null;

      const productName = product?.name ?? 'Producto desconocido';
      const variantName = presentation?.label ? `${productName} · ${presentation.label}` : productName;

      return {
        variantId,
        variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice,
        stockSource: (item.stockSource ?? 'warehouse') as 'warehouse' | 'personal',
      };
    });

    return {
      id: sale.id,
      date: sale.date,
      sellerId,
      sellerName: seller?.name ?? 'Vendedor desconocido',
      clientId: client?.id ?? undefined,
      clientName: client?.name ?? undefined,
      clientZoneId: clientZone?.id ?? undefined,
      clientZoneName: clientZone?.name ?? undefined,
      notes: sale.notes ?? undefined,
      itemCount: sale.items.length,
      total: sale.total,
      paymentMethod: sale.paymentMethod ?? null,
      paymentStatus: (sale.paymentStatus ?? 'pending') as 'pending' | 'partially_collected' | 'collected',
      amountPaid: sale.amountPaid ?? 0,
      collectedAt: sale.collectedAt ?? undefined,
      checkDueDate: sale.checkDueDate ?? undefined,
      ownerPaymentStatus: (sale.ownerPaymentStatus ?? 'pending') as 'pending' | 'partially_collected' | 'collected',
      ownerAmountPaid: sale.ownerAmountPaid ?? 0,
      ownerCollectedAt: sale.ownerCollectedAt ?? undefined,
      deliveryStatus: (sale.deliveryStatus ?? 'pending') as 'pending' | 'delivered',
      deliveredAt: sale.deliveredAt ?? undefined,
      items,
    };
  });
}

export async function registerPayment(
  saleId: number,
  amount: number,
  context:
    | { ownerId: number }
    | { sellerId: number; paymentMethod: 'cash' | 'transfer' | 'check'; checkDueDate: string | null },
): Promise<void> {
  const payload = await getPayloadClient();

  const sale = await payload.findByID({
    collection: 'sales',
    id: saleId,
    overrideAccess: true,
  });

  if (!sale) throw new Error('Venta no encontrada');

  if ('ownerId' in context) {
    const saleOwnerId = resolveId(sale.owner);
    if (saleOwnerId !== context.ownerId) throw new Error('No autorizado');

    if (sale.ownerPaymentStatus === 'collected') throw new Error('La venta ya fue cobrada');

    const currentOwnerAmountPaid = sale.ownerAmountPaid ?? 0;
    const ownerRemaining = sale.total - currentOwnerAmountPaid;

    if (amount <= 0) throw new Error('El monto debe ser mayor a cero');
    if (amount > ownerRemaining) throw new Error(`El monto no puede superar el restante ($${ownerRemaining})`);

    const newOwnerAmountPaid = currentOwnerAmountPaid + amount;
    const newOwnerStatus = newOwnerAmountPaid >= sale.total ? 'collected' : 'partially_collected';

    await payload.update({
      collection: 'sales',
      id: saleId,
      data: {
        ownerAmountPaid: newOwnerAmountPaid,
        ownerPaymentStatus: newOwnerStatus,
        ...(newOwnerStatus === 'collected' ? { ownerCollectedAt: new Date().toISOString() } : {}),
      } as Partial<Sale>,
      overrideAccess: true,
    });

    const saleSellerId = resolveId(sale.seller);
    if (saleSellerId) {
      await notifyEvent({
        recipientId: saleSellerId,
        ownerId: context.ownerId,
        type: 'payment_registered',
        title: 'Cobro registrado',
        body: `Tu venta fue cobrada por ${formatCurrency(amount)}`,
        metadata: { saleId, amount },
      });
    }
  } else {
    const saleSellerId = resolveId(sale.seller);
    if (saleSellerId !== context.sellerId) throw new Error('No autorizado');

    if (sale.paymentStatus === 'collected') throw new Error('La venta ya fue cobrada');

    const currentAmountPaid = sale.amountPaid ?? 0;
    const remaining = sale.total - currentAmountPaid;

    if (amount <= 0) throw new Error('El monto debe ser mayor a cero');
    if (amount > remaining) throw new Error(`El monto no puede superar el restante ($${remaining})`);

    const newAmountPaid = currentAmountPaid + amount;
    const newStatus = newAmountPaid >= sale.total ? 'collected' : 'partially_collected';

    await payload.update({
      collection: 'sales',
      id: saleId,
      data: {
        amountPaid: newAmountPaid,
        paymentStatus: newStatus,
        ...(newStatus === 'collected' ? { collectedAt: new Date().toISOString() } : {}),
        paymentMethod: context.paymentMethod,
        ...(context.checkDueDate ? { checkDueDate: context.checkDueDate } : {}),
      } as Partial<Sale>,
      overrideAccess: true,
    });

    const saleOwnerIdForNotif = resolveId(sale.owner);

    if (saleOwnerIdForNotif) {
      const sellerUser = await payload.findByID({
        collection: 'users',
        id: context.sellerId,
        overrideAccess: true,
      });
      const sellerName = sellerUser?.name ?? 'Vendedor';

      await notifyEvent({
        recipientId: saleOwnerIdForNotif,
        ownerId: saleOwnerIdForNotif,
        sellerId: context.sellerId,
        type: 'payment_registered',
        title: 'Cobro registrado',
        body: `${sellerName} registró cobro de ${formatCurrency(amount)}`,
        metadata: { saleId, amount, sellerId: context.sellerId },
      });
    }
  }
}

function verifySaleAccess(sale: Sale, callerId: number, callerRole: 'owner' | 'seller'): void {
  if (callerRole === 'owner') {
    const saleOwnerId = resolveId(sale.owner);
    if (saleOwnerId !== callerId) throw new Error('No autorizado');
  } else {
    const saleSellerId = resolveId(sale.seller);
    if (saleSellerId !== callerId) throw new Error('No autorizado');
  }
}

async function restoreItemStock(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  item: { variant: number | { id: number }; quantity: number; stockSource?: string | null },
  saleSellerId: number,
  ownerId: number,
  reason: string,
  transactionID: string | number,
): Promise<void> {
  const variantId = resolveId(item.variant) ?? 0;

  if (item.stockSource === 'warehouse') {
    const variant = await payload.findByID({
      collection: 'product-variants',
      id: variantId,
      overrideAccess: true,
      req: { transactionID },
    });
    if (!variant) return;
    const newStock = variant.stock + item.quantity;
    await payload.update({
      collection: 'product-variants',
      id: variantId,
      data: { stock: newStock },
      overrideAccess: true,
      req: { transactionID },
    });
    await payload.create({
      collection: 'stock-movements',
      data: {
        variant: variantId,
        type: 'sale_cancelled' as const,
        quantity: item.quantity,
        previousStock: variant.stock,
        newStock,
        reason,
        owner: ownerId,
        createdBy: saleSellerId,
      },
      overrideAccess: true,
      req: { transactionID },
    });
  } else {
    const { docs } = await payload.find({
      collection: 'mobile-seller-inventory',
      where: { and: [{ seller: { equals: saleSellerId } }, { variant: { equals: variantId } }] },
      limit: 1,
      overrideAccess: true,
      req: { transactionID },
    });
    if (!docs[0]) return;
    const newQty = docs[0].quantity + item.quantity;
    await payload.update({
      collection: 'mobile-seller-inventory',
      id: docs[0].id,
      data: { quantity: newQty },
      overrideAccess: true,
      req: { transactionID },
    });
    await payload.create({
      collection: 'stock-movements',
      data: {
        variant: variantId,
        type: 'sale_cancelled' as const,
        quantity: item.quantity,
        previousStock: docs[0].quantity,
        newStock: newQty,
        reason,
        mobileSeller: saleSellerId,
        owner: ownerId,
        createdBy: saleSellerId,
      },
      overrideAccess: true,
      req: { transactionID },
    });
  }
}

export async function deleteSale(saleId: number, callerId: number, callerRole: 'owner' | 'seller'): Promise<void> {
  const payload = await getPayloadClient();

  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) {
    throw new Error('No se pudo iniciar la transacción de base de datos');
  }

  try {
    const sale = await payload.findByID({
      collection: 'sales',
      id: saleId,
      depth: 1,
      overrideAccess: true,
      req: { transactionID },
    });

    if (!sale) throw new Error('Venta no encontrada');
    verifySaleAccess(sale as Sale, callerId, callerRole);

    const saleSellerId = resolveId(sale.seller) ?? callerId;
    const saleOwnerId = resolveId(sale.owner) ?? callerId;

    for (const item of sale.items) {
      await restoreItemStock(payload, item, saleSellerId, saleOwnerId, `Venta #${saleId} eliminada`, transactionID);
    }

    await payload.delete({ collection: 'sales', id: saleId, overrideAccess: true, req: { transactionID } });

    await payload.db.commitTransaction(transactionID);
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID);
    throw error;
  }

  try {
    revalidateTag('owner-dashboard');
    revalidateTag('seller-dashboard');
    revalidateTag('product-demand');
  } catch {
    // revalidation failure should not break the operation
  }
}

export async function editSaleFull(
  saleId: number,
  callerId: number,
  callerRole: 'owner' | 'seller',
  data: SaleValues,
): Promise<void> {
  const payload = await getPayloadClient();

  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) {
    throw new Error('No se pudo iniciar la transacción de base de datos');
  }

  try {
    const sale = await payload.findByID({
      collection: 'sales',
      id: saleId,
      depth: 1,
      overrideAccess: true,
      req: { transactionID },
    });

    if (!sale) throw new Error('Venta no encontrada');
    verifySaleAccess(sale as Sale, callerId, callerRole);

    const saleSellerId = resolveId(sale.seller) ?? callerId;
    const saleOwnerId = resolveId(sale.owner) ?? callerId;

    for (const item of sale.items) {
      await restoreItemStock(
        payload,
        item,
        saleSellerId,
        saleOwnerId,
        `Edición venta #${saleId} — reversión`,
        transactionID,
      );
    }

    const editVariantIds = data.items.map((item) => item.variantId);
    const editVariantsResult = await payload.find({
      collection: 'product-variants',
      where: { id: { in: editVariantIds } },
      depth: 1,
      limit: editVariantIds.length,
      overrideAccess: true,
      req: { transactionID },
    });
    const editVariantMap = new Map(editVariantsResult.docs.map((v) => [v.id, { ...v }]));

    const editPersonalItems = data.items.filter((item) => item.stockSource === 'personal');
    const editInventoryMap = new Map<number, { id: number; quantity: number }>();
    if (editPersonalItems.length > 0) {
      const editPersonalVariantIds = editPersonalItems.map((item) => item.variantId);
      const editInventoryResult = await payload.find({
        collection: 'mobile-seller-inventory',
        where: {
          and: [{ seller: { equals: saleSellerId } }, { variant: { in: editPersonalVariantIds } }],
        },
        limit: editPersonalVariantIds.length,
        overrideAccess: true,
        req: { transactionID },
      });
      for (const inv of editInventoryResult.docs) {
        const variantId = typeof inv.variant === 'number' ? inv.variant : inv.variant.id;
        editInventoryMap.set(variantId, { id: inv.id, quantity: inv.quantity });
      }
    }

    for (const item of data.items) {
      const variant = editVariantMap.get(item.variantId);
      if (!variant) throw new Error(`Variante ${item.variantId} no encontrada`);

      if (item.stockSource === 'warehouse') {
        if (variant.stock < item.quantity) {
          throw new Error(
            `Stock insuficiente en depósito para ${variant.code ?? item.variantId}. ` +
              `Disponible: ${variant.stock}, requerido: ${item.quantity}`,
          );
        }
        const previousStock = variant.stock;
        const newStock = previousStock - item.quantity;
        variant.stock = newStock;
        await payload.update({
          collection: 'product-variants',
          id: item.variantId,
          data: { stock: newStock },
          overrideAccess: true,
          req: { transactionID },
        });
        await payload.create({
          collection: 'stock-movements',
          data: {
            variant: item.variantId,
            type: 'sale_edit' as const,
            quantity: -item.quantity,
            previousStock,
            newStock,
            reason: `Edición venta #${saleId}`,
            owner: saleOwnerId,
            createdBy: callerId,
          },
          overrideAccess: true,
          req: { transactionID },
        });
      } else {
        const inventoryRecord = editInventoryMap.get(item.variantId);
        if (!inventoryRecord || inventoryRecord.quantity < item.quantity) {
          throw new Error(
            `Stock insuficiente en inventario personal para ${variant.code ?? item.variantId}. ` +
              `Disponible: ${inventoryRecord?.quantity ?? 0}, requerido: ${item.quantity}`,
          );
        }
        const previousQuantity = inventoryRecord.quantity;
        const newMobileStock = previousQuantity - item.quantity;
        inventoryRecord.quantity = newMobileStock;
        await payload.update({
          collection: 'mobile-seller-inventory',
          id: inventoryRecord.id,
          data: { quantity: newMobileStock },
          overrideAccess: true,
          req: { transactionID },
        });
        await payload.create({
          collection: 'stock-movements',
          data: {
            variant: item.variantId,
            type: 'sale_edit' as const,
            quantity: -item.quantity,
            previousStock: previousQuantity,
            newStock: newMobileStock,
            reason: `Edición venta #${saleId}`,
            mobileSeller: saleSellerId,
            owner: saleOwnerId,
            createdBy: callerId,
          },
          overrideAccess: true,
          req: { transactionID },
        });
      }
    }

    const newTotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const amountPaid = sale.amountPaid ?? 0;
    const ownerAmountPaid = sale.ownerAmountPaid ?? 0;

    const newPaymentStatus = amountPaid >= newTotal ? 'collected' : amountPaid > 0 ? 'partially_collected' : 'pending';
    const newOwnerPaymentStatus =
      ownerAmountPaid >= newTotal ? 'collected' : ownerAmountPaid > 0 ? 'partially_collected' : 'pending';

    const isImmediate = data.paymentMethod !== 'credit';

    await payload.update({
      collection: 'sales',
      id: saleId,
      data: {
        items: data.items.map((item) => ({
          variant: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          stockSource: item.stockSource,
        })),
        total: newTotal,
        ...(data.clientId ? { client: data.clientId } : { client: null }),
        notes: data.notes ?? null,
        ...(isImmediate
          ? { paymentMethod: data.paymentMethod as 'cash' | 'transfer' | 'check' }
          : { paymentMethod: null }),
        ...(data.checkDueDate ? { checkDueDate: data.checkDueDate } : { checkDueDate: null }),
        paymentStatus: newPaymentStatus,
        ownerPaymentStatus: newOwnerPaymentStatus,
      } as Partial<Sale>,
      overrideAccess: true,
      req: { transactionID },
    });

    await payload.db.commitTransaction(transactionID);
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID);
    throw error;
  }

  try {
    revalidateTag('owner-dashboard');
    revalidateTag('seller-dashboard');
    revalidateTag('product-demand');
  } catch {
    // revalidation failure should not break the operation
  }
}

export async function markAsDelivered(saleId: number, callerId: number, callerRole: 'owner' | 'seller'): Promise<void> {
  const payload = await getPayloadClient();

  const sale = await payload.findByID({
    collection: 'sales',
    id: saleId,
    overrideAccess: true,
  });

  if (!sale) throw new Error('Venta no encontrada');

  verifySaleAccess(sale as Sale, callerId, callerRole);

  if (sale.deliveryStatus === 'delivered') throw new Error('La venta ya fue marcada como entregada');

  await payload.update({
    collection: 'sales',
    id: saleId,
    data: {
      deliveryStatus: 'delivered',
      deliveredAt: new Date().toISOString(),
    } as Partial<Sale>,
    overrideAccess: true,
  });
}

export async function getSaleOptionsForOwner(sellerId: number, ownerId: number): Promise<SaleOptions> {
  return getSaleOptions(sellerId, ownerId);
}

export const getProductDemandSummary = unstable_cache(
  async (ownerId: number): Promise<Record<number, VariantDemandSummary>> => {
    const payload = await getPayloadClient();

    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

    const result = await payload.find({
      collection: 'sales',
      where: {
        and: [{ owner: { equals: ownerId } }, { date: { greater_than_equal: thirteenMonthsAgo.toISOString() } }],
      },
      depth: 0,
      limit: 10000,
      overrideAccess: true,
    });

    const demandMap: Record<number, VariantDemandSummary> = {};

    for (const sale of result.docs) {
      for (const item of sale.items) {
        const variantId = resolveId(item.variant) ?? 0;
        const existing = demandMap[variantId];
        if (!existing) {
          demandMap[variantId] = { lastSoldAt: sale.date, totalUnits: item.quantity };
        } else {
          existing.totalUnits += item.quantity;
          if (sale.date > (existing.lastSoldAt ?? '')) {
            existing.lastSoldAt = sale.date;
          }
        }
      }
    }

    return demandMap;
  },
  ['product-demand-summary'],
  { revalidate: 60 * 5, tags: ['product-demand'] },
);

export const getVariantSalesHistory = unstable_cache(
  async (variantId: number, ownerId: number): Promise<VariantSalesHistory> => {
    const payload = await getPayloadClient();

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    const result = await payload.find({
      collection: 'sales',
      where: {
        and: [
          { owner: { equals: ownerId } },
          { 'items.variant': { equals: variantId } },
          { date: { greater_than_equal: twelveMonthsAgo.toISOString() } },
        ],
      },
      depth: 0,
      limit: 10000,
      overrideAccess: true,
    });

    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const monthly: MonthlyDemand[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthly.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        units: 0,
        revenue: 0,
      });
    }

    const monthMap = new Map<string, MonthlyDemand>();
    for (const m of monthly) monthMap.set(m.month, m);

    const prevMonthEntry: MonthlyDemand = { month: previousMonthKey, units: 0, revenue: 0 };
    if (!monthMap.has(previousMonthKey)) monthMap.set(previousMonthKey, prevMonthEntry);

    let lastSoldAt: string | null = null;
    let totalUnits = 0;
    let totalRevenue = 0;

    for (const sale of result.docs) {
      const saleDate = new Date(sale.date);
      const saleMonth = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;

      for (const item of sale.items) {
        const itemVariantId = resolveId(item.variant) ?? 0;
        if (itemVariantId !== variantId) continue;

        const itemRevenue = item.quantity * item.unitPrice;

        if (saleMonth !== previousMonthKey) {
          totalUnits += item.quantity;
          totalRevenue += itemRevenue;
        }

        if (!lastSoldAt || sale.date > lastSoldAt) {
          lastSoldAt = sale.date;
        }

        const entry = monthMap.get(saleMonth);
        if (entry) {
          entry.units += item.quantity;
          entry.revenue += itemRevenue;
        }
      }
    }

    const currentMonth: MonthSummary = monthMap.get(currentMonthKey) ?? { units: 0, revenue: 0 };
    const previousMonth: MonthSummary = monthMap.get(previousMonthKey) ?? { units: 0, revenue: 0 };

    return { variantId, lastSoldAt, totalUnits, totalRevenue, monthly, currentMonth, previousMonth };
  },
  ['product-demand-history'],
  { revalidate: 60 * 5, tags: ['product-demand'] },
);
