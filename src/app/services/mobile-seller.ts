'use server';

import { notifyEvent } from '@/lib/notify';
import { getPayloadClient } from '@/lib/payload';

export interface MobileInventoryItem {
  id: number;
  variantId: number;
  productName: string;
  presentationName?: string;
  code?: string;
  quantity: number;
  price: number;
}

export interface DispatchItem {
  variantId: number;
  quantity: number;
}

export async function getMobileSellerInventory(sellerId: number): Promise<MobileInventoryItem[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'mobile-seller-inventory',
    where: {
      and: [{ seller: { equals: sellerId } }, { quantity: { greater_than: 0 } }],
    },
    depth: 2,
    limit: 1000,
    overrideAccess: true,
  });

  return result.docs.map((item) => {
    const variant = typeof item.variant === 'object' ? item.variant : null;
    const product = variant && typeof variant.product === 'object' ? variant.product : null;
    const presentation =
      variant && variant.presentation && typeof variant.presentation === 'object' ? variant.presentation : null;

    return {
      id: item.id,
      variantId: typeof item.variant === 'number' ? item.variant : item.variant.id,
      productName: product?.name ?? 'Producto desconocido',
      presentationName: presentation?.label ?? undefined,
      code: variant?.code ?? undefined,
      quantity: item.quantity,
      price: variant ? variant.costPrice * (1 + (variant.profitMargin ?? 0) / 100) : 0,
    };
  });
}

export async function dispatchStockToMobileSeller(
  sellerId: number,
  ownerId: number,
  items: DispatchItem[],
): Promise<void> {
  const payload = await getPayloadClient();

  const activeItems = items.filter((item) => item.quantity > 0);
  if (activeItems.length === 0) return;

  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) {
    throw new Error('No se pudo iniciar la transacción de base de datos');
  }

  try {
    const variantIds = activeItems.map((item) => item.variantId);

    const [variantsResult, inventoryResult] = await Promise.all([
      payload.find({
        collection: 'product-variants',
        where: { id: { in: variantIds } },
        depth: 1,
        limit: variantIds.length,
        overrideAccess: true,
        req: { transactionID },
      }),
      payload.find({
        collection: 'mobile-seller-inventory',
        where: {
          and: [{ seller: { equals: sellerId } }, { variant: { in: variantIds } }],
        },
        limit: variantIds.length,
        overrideAccess: true,
        req: { transactionID },
      }),
    ]);

    const variantMap = new Map(variantsResult.docs.map((v) => [v.id, { ...v }]));
    const inventoryMap = new Map(
      inventoryResult.docs.map((inv) => {
        const variantId = typeof inv.variant === 'number' ? inv.variant : inv.variant.id;
        return [variantId, inv];
      }),
    );

    const dispatchedProductNames: string[] = [];

    for (const item of activeItems) {
      const variant = variantMap.get(item.variantId);
      if (!variant) throw new Error(`Variante ${item.variantId} no encontrada`);

      const productName = typeof variant.product === 'object' ? variant.product.name : `Variante ${item.variantId}`;
      dispatchedProductNames.push(`${item.quantity}x ${productName}`);

      const warehouseStock = variant.stock;

      if (warehouseStock < item.quantity) {
        throw new Error(
          `Stock insuficiente para la variante ${variant.code ?? item.variantId}. ` +
            `Disponible: ${warehouseStock}, solicitado: ${item.quantity}`,
        );
      }

      const newWarehouseStock = warehouseStock - item.quantity;
      variant.stock = newWarehouseStock;

      await payload.update({
        collection: 'product-variants',
        id: item.variantId,
        data: { stock: newWarehouseStock },
        overrideAccess: true,
        req: { transactionID },
      });

      const existingInventory = inventoryMap.get(item.variantId);

      if (existingInventory) {
        await payload.update({
          collection: 'mobile-seller-inventory',
          id: existingInventory.id,
          data: { quantity: existingInventory.quantity + item.quantity },
          overrideAccess: true,
          req: { transactionID },
        });
      } else {
        await payload.create({
          collection: 'mobile-seller-inventory',
          data: {
            seller: sellerId,
            variant: item.variantId,
            quantity: item.quantity,
            owner: ownerId,
          },
          overrideAccess: true,
          req: { transactionID },
        });
      }

      await payload.create({
        collection: 'stock-movements',
        data: {
          variant: item.variantId,
          type: 'dispatch_to_mobile',
          quantity: item.quantity,
          previousStock: warehouseStock,
          newStock: newWarehouseStock,
          mobileSeller: sellerId,
          owner: ownerId,
          createdBy: ownerId,
          reason: `Despacho a vendedor móvil (ID: ${sellerId})`,
        },
        overrideAccess: true,
        req: { transactionID },
      });
    }

    await payload.db.commitTransaction(transactionID);
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID);
    throw error;
  }

  const variantsResult = await payload.find({
    collection: 'product-variants',
    where: { id: { in: activeItems.map((i) => i.variantId) } },
    depth: 1,
    limit: activeItems.length,
    overrideAccess: true,
  });
  const variantMapForNotif = new Map(variantsResult.docs.map((v) => [v.id, v]));

  const names = activeItems.map((item) => {
    const variant = variantMapForNotif.get(item.variantId);
    const productName = typeof variant?.product === 'object' ? variant.product.name : `Variante ${item.variantId}`;
    return `${item.quantity}x ${productName}`;
  });

  if (names.length > 0) {
    const summary = names.length <= 3 ? names.join(', ') : `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`;

    await notifyEvent({
      recipientId: sellerId,
      ownerId,
      type: 'stock_dispatched',
      title: 'Stock recibido',
      body: `Recibiste ${summary} de tu depósito`,
      metadata: { sellerId, ownerId, items },
    });
  }
}

export async function returnStockFromMobileSeller(
  sellerId: number,
  ownerId: number,
  items: DispatchItem[],
): Promise<void> {
  const payload = await getPayloadClient();

  const activeItems = items.filter((item) => item.quantity > 0);
  if (activeItems.length === 0) return;

  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) {
    throw new Error('No se pudo iniciar la transacción de base de datos');
  }

  try {
    const variantIds = activeItems.map((item) => item.variantId);

    const [variantsResult, inventoryResult] = await Promise.all([
      payload.find({
        collection: 'product-variants',
        where: { id: { in: variantIds } },
        depth: 1,
        limit: variantIds.length,
        overrideAccess: true,
        req: { transactionID },
      }),
      payload.find({
        collection: 'mobile-seller-inventory',
        where: {
          and: [{ seller: { equals: sellerId } }, { variant: { in: variantIds } }],
        },
        limit: variantIds.length,
        overrideAccess: true,
        req: { transactionID },
      }),
    ]);

    const variantMap = new Map(variantsResult.docs.map((v) => [v.id, { ...v }]));
    const inventoryMap = new Map(
      inventoryResult.docs.map((inv) => {
        const variantId = typeof inv.variant === 'number' ? inv.variant : inv.variant.id;
        return [variantId, { ...inv }];
      }),
    );

    for (const item of activeItems) {
      const mobileInventory = inventoryMap.get(item.variantId);

      if (!mobileInventory) {
        throw new Error(`El vendedor no tiene stock de la variante ${item.variantId}`);
      }

      if (mobileInventory.quantity < item.quantity) {
        throw new Error(
          `Cantidad a devolver (${item.quantity}) mayor al stock del vendedor (${mobileInventory.quantity})`,
        );
      }

      const variant = variantMap.get(item.variantId);
      if (!variant) throw new Error(`Variante ${item.variantId} no encontrada`);

      const warehouseStock = variant.stock;
      const newWarehouseStock = warehouseStock + item.quantity;
      variant.stock = newWarehouseStock;

      const previousMobileQuantity = mobileInventory.quantity;
      mobileInventory.quantity = previousMobileQuantity - item.quantity;

      await payload.update({
        collection: 'product-variants',
        id: item.variantId,
        data: { stock: newWarehouseStock },
        overrideAccess: true,
        req: { transactionID },
      });

      await payload.update({
        collection: 'mobile-seller-inventory',
        id: mobileInventory.id,
        data: { quantity: mobileInventory.quantity },
        overrideAccess: true,
        req: { transactionID },
      });

      await payload.create({
        collection: 'stock-movements',
        data: {
          variant: item.variantId,
          type: 'return_from_mobile',
          quantity: item.quantity,
          previousStock: warehouseStock,
          newStock: newWarehouseStock,
          mobileSeller: sellerId,
          owner: ownerId,
          createdBy: ownerId,
          reason: `Devolución de vendedor móvil (ID: ${sellerId})`,
        },
        overrideAccess: true,
        req: { transactionID },
      });
    }

    await payload.db.commitTransaction(transactionID);
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID);
    throw error;
  }

  const sellerUser = await payload.findByID({ collection: 'users', id: sellerId, overrideAccess: true });
  const sellerName = sellerUser?.name ?? 'Vendedor';

  const variantsResult = await payload.find({
    collection: 'product-variants',
    where: { id: { in: activeItems.map((i) => i.variantId) } },
    depth: 1,
    limit: activeItems.length,
    overrideAccess: true,
  });
  const variantMapForNotif = new Map(variantsResult.docs.map((v) => [v.id, v]));

  const returnedProductNames = activeItems.map((item) => {
    const variant = variantMapForNotif.get(item.variantId);
    const productName = typeof variant?.product === 'object' ? variant.product.name : `Variante ${item.variantId}`;
    return `${item.quantity}x ${productName}`;
  });

  if (returnedProductNames.length > 0) {
    const summary =
      returnedProductNames.length <= 3
        ? returnedProductNames.join(', ')
        : `${returnedProductNames.slice(0, 2).join(', ')} y ${returnedProductNames.length - 2} más`;

    await notifyEvent({
      recipientId: ownerId,
      ownerId,
      type: 'stock_returned',
      title: 'Devolución recibida',
      body: `${sellerName} devolvió ${summary}`,
      metadata: { sellerId, ownerId, items },
    });
  }
}

export interface SellerInventorySummary {
  sellerId: number;
  sellerName: string;
  sellerEmail: string;
  items: MobileInventoryItem[];
  totalQuantity: number;
}

export async function getAllSellersInventoryForOwner(ownerId: number): Promise<SellerInventorySummary[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'mobile-seller-inventory',
    where: {
      and: [{ owner: { equals: ownerId } }, { quantity: { greater_than: 0 } }],
    },
    depth: 2,
    limit: 1000,
    overrideAccess: true,
  });

  const sellerMap = new Map<number, SellerInventorySummary>();

  for (const item of result.docs) {
    const seller = typeof item.seller === 'object' ? item.seller : null;
    if (!seller) continue;

    const variant = typeof item.variant === 'object' ? item.variant : null;
    const product = variant && typeof variant.product === 'object' ? variant.product : null;
    const presentation =
      variant && variant.presentation && typeof variant.presentation === 'object' ? variant.presentation : null;

    const mappedItem: MobileInventoryItem = {
      id: item.id,
      variantId: typeof item.variant === 'number' ? item.variant : item.variant.id,
      productName: product?.name ?? 'Producto desconocido',
      presentationName: presentation?.label ?? undefined,
      code: variant?.code ?? undefined,
      quantity: item.quantity,
      price: variant ? variant.costPrice * (1 + (variant.profitMargin ?? 0) / 100) : 0,
    };

    const existing = sellerMap.get(seller.id);
    if (existing) {
      existing.items.push(mappedItem);
      existing.totalQuantity += item.quantity;
    } else {
      sellerMap.set(seller.id, {
        sellerId: seller.id,
        sellerName: seller.name,
        sellerEmail: seller.email,
        items: [mappedItem],
        totalQuantity: item.quantity,
      });
    }
  }

  return Array.from(sellerMap.values()).sort((a, b) => a.sellerName.localeCompare(b.sellerName, 'es'));
}

export async function getMobileSellerInventoryForOwner(
  sellerId: number,
  ownerId: number,
): Promise<MobileInventoryItem[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'mobile-seller-inventory',
    where: {
      and: [{ seller: { equals: sellerId } }, { owner: { equals: ownerId } }, { quantity: { greater_than: 0 } }],
    },
    depth: 2,
    limit: 1000,
    overrideAccess: true,
  });

  return result.docs.map((item) => {
    const variant = typeof item.variant === 'object' ? item.variant : null;
    const product = variant && typeof variant.product === 'object' ? variant.product : null;
    const presentation =
      variant && variant.presentation && typeof variant.presentation === 'object' ? variant.presentation : null;

    return {
      id: item.id,
      variantId: typeof item.variant === 'number' ? item.variant : item.variant.id,
      productName: product?.name ?? 'Producto desconocido',
      presentationName: presentation?.label ?? undefined,
      code: variant?.code ?? undefined,
      quantity: item.quantity,
      price: variant ? variant.costPrice * (1 + (variant.profitMargin ?? 0) / 100) : 0,
    };
  });
}
