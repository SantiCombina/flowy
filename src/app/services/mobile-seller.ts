'use server';

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

  for (const item of items) {
    if (item.quantity <= 0) continue;

    const variant = await payload.findByID({
      collection: 'product-variants',
      id: item.variantId,
      overrideAccess: true,
    });

    if (!variant) throw new Error(`Variante ${item.variantId} no encontrada`);

    const warehouseStock = variant.stock;

    if (warehouseStock < item.quantity) {
      throw new Error(
        `Stock insuficiente para la variante ${variant.code ?? item.variantId}. ` +
          `Disponible: ${warehouseStock}, solicitado: ${item.quantity}`,
      );
    }

    // Decrement warehouse stock
    const newWarehouseStock = warehouseStock - item.quantity;
    await payload.update({
      collection: 'product-variants',
      id: item.variantId,
      data: { stock: newWarehouseStock },
      overrideAccess: true,
    });

    // Upsert mobile seller inventory
    const { docs: existingInventory } = await payload.find({
      collection: 'mobile-seller-inventory',
      where: {
        and: [{ seller: { equals: sellerId } }, { variant: { equals: item.variantId } }],
      },
      limit: 1,
      overrideAccess: true,
    });

    if (existingInventory.length > 0) {
      await payload.update({
        collection: 'mobile-seller-inventory',
        id: existingInventory[0].id,
        data: { quantity: existingInventory[0].quantity + item.quantity },
        overrideAccess: true,
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
      });
    }

    // Create stock movement record
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
    });
  }
}

export async function returnStockFromMobileSeller(
  sellerId: number,
  ownerId: number,
  items: DispatchItem[],
): Promise<void> {
  const payload = await getPayloadClient();

  for (const item of items) {
    if (item.quantity <= 0) continue;

    // Find mobile seller inventory record
    const { docs: existingInventory } = await payload.find({
      collection: 'mobile-seller-inventory',
      where: {
        and: [{ seller: { equals: sellerId } }, { variant: { equals: item.variantId } }],
      },
      limit: 1,
      overrideAccess: true,
    });

    if (existingInventory.length === 0) {
      throw new Error(`El vendedor no tiene stock de la variante ${item.variantId}`);
    }

    const mobileInventory = existingInventory[0];

    if (mobileInventory.quantity < item.quantity) {
      throw new Error(
        `Cantidad a devolver (${item.quantity}) mayor al stock del vendedor (${mobileInventory.quantity})`,
      );
    }

    const variant = await payload.findByID({
      collection: 'product-variants',
      id: item.variantId,
      overrideAccess: true,
    });

    if (!variant) throw new Error(`Variante ${item.variantId} no encontrada`);

    const warehouseStock = variant.stock;
    const newWarehouseStock = warehouseStock + item.quantity;

    // Increment warehouse stock
    await payload.update({
      collection: 'product-variants',
      id: item.variantId,
      data: { stock: newWarehouseStock },
      overrideAccess: true,
    });

    // Decrement mobile seller inventory
    await payload.update({
      collection: 'mobile-seller-inventory',
      id: mobileInventory.id,
      data: { quantity: mobileInventory.quantity - item.quantity },
      overrideAccess: true,
    });

    // Create stock movement record
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
