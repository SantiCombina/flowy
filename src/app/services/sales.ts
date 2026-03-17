'use server';

import type { Where } from 'payload';

import { getPayloadClient } from '@/lib/payload';
import type { Sale } from '@/payload-types';
import type { SaleValues } from '@/schemas/sales/sale-schema';

export interface SaleVariantOption {
  variantId: number;
  productName: string;
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
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SaleRow {
  id: number;
  date: string;
  sellerName: string;
  clientName?: string;
  itemCount: number;
  total: number;
  paymentMethod: 'cash' | 'transfer' | 'check';
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

    return {
      variantId: variant.id,
      productName: product?.name ?? 'Producto desconocido',
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

  for (const item of data.items) {
    const variant = await payload.findByID({
      collection: 'product-variants',
      id: item.variantId,
      overrideAccess: true,
    });

    if (!variant) throw new Error(`Variante ${item.variantId} no encontrada`);

    if (item.stockSource === 'warehouse') {
      if (variant.stock < item.quantity) {
        throw new Error(
          `Stock insuficiente en depósito para ${variant.code ?? item.variantId}. ` +
            `Disponible: ${variant.stock}, requerido: ${item.quantity}`,
        );
      }

      const newStock = variant.stock - item.quantity;

      await payload.update({
        collection: 'product-variants',
        id: item.variantId,
        data: { stock: newStock },
        overrideAccess: true,
      });

      await payload.create({
        collection: 'stock-movements',
        data: {
          variant: item.variantId,
          type: 'sale',
          quantity: item.quantity,
          previousStock: variant.stock,
          newStock,
          owner: ownerId,
          createdBy: sellerId,
        },
        overrideAccess: true,
      });
    } else {
      const { docs: inventoryDocs } = await payload.find({
        collection: 'mobile-seller-inventory',
        where: {
          and: [{ seller: { equals: sellerId } }, { variant: { equals: item.variantId } }],
        },
        limit: 1,
        overrideAccess: true,
      });

      const inventoryRecord = inventoryDocs[0];

      if (!inventoryRecord || inventoryRecord.quantity < item.quantity) {
        throw new Error(
          `Stock insuficiente en inventario personal para ${variant.code ?? item.variantId}. ` +
            `Disponible: ${inventoryRecord?.quantity ?? 0}, requerido: ${item.quantity}`,
        );
      }

      const newMobileStock = inventoryRecord.quantity - item.quantity;

      await payload.update({
        collection: 'mobile-seller-inventory',
        id: inventoryRecord.id,
        data: { quantity: newMobileStock },
        overrideAccess: true,
      });

      await payload.create({
        collection: 'stock-movements',
        data: {
          variant: item.variantId,
          type: 'sale',
          quantity: item.quantity,
          previousStock: inventoryRecord.quantity,
          newStock: newMobileStock,
          mobileSeller: sellerId,
          owner: ownerId,
          createdBy: sellerId,
        },
        overrideAccess: true,
      });
    }
  }

  const sale = await payload.create({
    collection: 'sales',
    data: {
      seller: sellerId,
      owner: ownerId,
      ...(data.clientId ? { client: data.clientId } : {}),
      date: new Date().toISOString(),
      paymentMethod: data.paymentMethod,
      items: data.items.map((item) => ({
        variant: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        stockSource: item.stockSource,
      })),
      total: data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
      ...(data.notes ? { notes: data.notes } : {}),
    },
    overrideAccess: true,
  });

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

  return result.docs.map((sale) => {
    const seller = typeof sale.seller === 'object' ? sale.seller : null;
    const client = sale.client && typeof sale.client === 'object' ? sale.client : null;

    const items: SaleItemDetail[] = sale.items.map((item) => {
      const variant = typeof item.variant === 'object' ? item.variant : null;
      const product = variant && typeof variant.product === 'object' ? variant.product : null;
      const presentation =
        variant?.presentation && typeof variant.presentation === 'object' ? variant.presentation : null;

      const productName = product?.name ?? 'Producto desconocido';
      const variantName = presentation?.label ? `${productName} · ${presentation.label}` : productName;

      return {
        variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice,
      };
    });

    return {
      id: sale.id,
      date: sale.date,
      sellerName: seller?.name ?? 'Vendedor desconocido',
      clientName: client?.name ?? undefined,
      itemCount: sale.items.length,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      items,
    };
  });
}
