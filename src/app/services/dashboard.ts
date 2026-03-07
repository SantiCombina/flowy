'use server';

import { getClients } from '@/app/services/clients';
import { getMobileSellerInventory, getAllSellersInventoryForOwner } from '@/app/services/mobile-seller';
import type { MobileInventoryItem } from '@/app/services/mobile-seller';
import { getSales } from '@/app/services/sales';
import type { SaleRow } from '@/app/services/sales';
import { getSellers } from '@/app/services/users';
import { getPayloadClient } from '@/lib/payload';

export type Period = 'day' | 'week' | 'month' | 'year';

export interface DayData {
  date: string;
  total: number;
  count: number;
}

export interface SellerPerf {
  name: string;
  total: number;
  count: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export interface LowStockAlert {
  name: string;
  presentation?: string;
  code?: string;
  stock: number;
}

export interface OwnerDashboardStats {
  revenue: { current: number; previous: number; change: number };
  salesCount: { current: number; previous: number; change: number };
  clientsTotal: number;
  newClientsInPeriod: number;
  activeProducts: number;
  warehouseVariantsWithStock: number;
  sellersCount: number;
  sellersWithInventory: number;
  salesByDay: DayData[];
  salesBySeller: SellerPerf[];
  paymentMethods: { cash: number; transfer: number; check: number };
  topProducts: TopProduct[];
  lowStockAlerts: LowStockAlert[];
  recentSales: SaleRow[];
}

export interface SellerDashboardStats {
  revenue: { current: number; previous: number; change: number };
  salesCount: { current: number; previous: number; change: number };
  clientsCount: number;
  inventoryItems: number;
  inventoryUnits: number;
  salesByDay: DayData[];
  paymentMethods: { cash: number; transfer: number; check: number };
  topProducts: TopProduct[];
  inventory: MobileInventoryItem[];
  recentSales: SaleRow[];
}

function getPeriodRanges(period: Period) {
  const now = new Date();

  switch (period) {
    case 'day': {
      const currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, -1).toISOString();
      const chartStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { currentStart, prevStart, prevEnd, chartStart };
    }
    case 'week': {
      const dow = now.getDay();
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      const currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset).toISOString();
      const prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset - 7).toISOString();
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset, 0, 0, -1).toISOString();
      const chartStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { currentStart, prevStart, prevEnd, chartStart };
    }
    case 'month': {
      const currentStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
      const chartStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return { currentStart, prevStart, prevEnd, chartStart };
    }
    case 'year': {
      const currentStart = new Date(now.getFullYear(), 0, 1).toISOString();
      const prevStart = new Date(now.getFullYear() - 1, 0, 1).toISOString();
      const prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString();
      return { currentStart, prevStart, prevEnd, chartStart: currentStart };
    }
  }
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function toDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildChartData(period: Period, chartStart: string): DayData[] {
  if (period === 'year') {
    const year = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => ({
      date: `${year}-${String(i + 1).padStart(2, '0')}`,
      total: 0,
      count: 0,
    }));
  }

  const days: DayData[] = [];
  const start = new Date(chartStart);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: key, total: 0, count: 0 });
  }
  return days;
}

export async function getOwnerDashboardStats(ownerId: number, period: Period = 'month'): Promise<OwnerDashboardStats> {
  const { currentStart, prevStart, prevEnd, chartStart } = getPeriodRanges(period);
  const payload = await getPayloadClient();

  const [allSales, clients, sellers, sellersInventory, variantsResult] = await Promise.all([
    getSales({ ownerId, dateFrom: prevStart }),
    getClients({ ownerId }),
    getSellers(ownerId),
    getAllSellersInventoryForOwner(ownerId),
    payload.find({
      collection: 'product-variants',
      where: { owner: { equals: ownerId } },
      depth: 2,
      limit: 1000,
      overrideAccess: true,
    }),
  ]);

  let revCurrent = 0,
    revPrevious = 0,
    salesCurrent = 0,
    salesPrevious = 0;

  const chartData = buildChartData(period, chartStart);
  const chartMap = new Map<string, DayData>();
  for (const d of chartData) chartMap.set(d.date, d);

  const sellerMap = new Map<string, SellerPerf>();
  const paymentMethods = { cash: 0, transfer: 0, check: 0 };
  const productMap = new Map<string, TopProduct>();

  for (const sale of allSales) {
    const saleDate = sale.date;

    if (saleDate >= currentStart) {
      revCurrent += sale.total;
      salesCurrent++;
      paymentMethods[sale.paymentMethod] += sale.total;

      const existingSeller = sellerMap.get(sale.sellerName);
      if (existingSeller) {
        existingSeller.total += sale.total;
        existingSeller.count++;
      } else {
        sellerMap.set(sale.sellerName, { name: sale.sellerName, total: sale.total, count: 1 });
      }

      for (const item of sale.items) {
        const existingProduct = productMap.get(item.variantName);
        if (existingProduct) {
          existingProduct.quantity += item.quantity;
          existingProduct.revenue += item.subtotal;
        } else {
          productMap.set(item.variantName, { name: item.variantName, quantity: item.quantity, revenue: item.subtotal });
        }
      }
    } else if (saleDate >= prevStart && saleDate <= prevEnd) {
      revPrevious += sale.total;
      salesPrevious++;
    }

    if (saleDate >= chartStart) {
      const key = period === 'year' ? toMonthKey(saleDate) : toDateKey(saleDate);
      const entry = chartMap.get(key);
      if (entry) {
        entry.total += sale.total;
        entry.count++;
      }
    }
  }

  const newClientsInPeriod = clients.filter((c) => c.createdAt >= currentStart).length;
  const warehouseVariantsWithStock = variantsResult.docs.filter((v) => v.stock > 0).length;
  const activeProducts = variantsResult.docs.length;

  const lowStockAlerts: LowStockAlert[] = variantsResult.docs
    .filter((v) => v.stock < 5)
    .map((v) => {
      const product = typeof v.product === 'object' ? v.product : null;
      const presentation = v.presentation && typeof v.presentation === 'object' ? v.presentation : null;
      return {
        name: product?.name ?? 'Producto desconocido',
        presentation: presentation?.label ?? undefined,
        code: v.code ?? undefined,
        stock: v.stock,
      };
    })
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10);

  return {
    revenue: { current: revCurrent, previous: revPrevious, change: calcChange(revCurrent, revPrevious) },
    salesCount: { current: salesCurrent, previous: salesPrevious, change: calcChange(salesCurrent, salesPrevious) },
    clientsTotal: clients.length,
    newClientsInPeriod,
    activeProducts,
    warehouseVariantsWithStock,
    sellersCount: sellers.length,
    sellersWithInventory: sellersInventory.length,
    salesByDay: chartData,
    salesBySeller: Array.from(sellerMap.values()).sort((a, b) => b.total - a.total),
    paymentMethods,
    topProducts: Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    lowStockAlerts,
    recentSales: allSales.slice(0, 5),
  };
}

export async function getSellerDashboardStats(
  sellerId: number,
  ownerId: number,
  period: Period = 'month',
): Promise<SellerDashboardStats> {
  const { currentStart, prevStart, prevEnd, chartStart } = getPeriodRanges(period);

  const [mySales, clients, inventory] = await Promise.all([
    getSales({ sellerId, dateFrom: prevStart }),
    getClients({ ownerId, sellerId }),
    getMobileSellerInventory(sellerId),
  ]);

  let revCurrent = 0,
    revPrevious = 0,
    salesCurrent = 0,
    salesPrevious = 0;

  const chartData = buildChartData(period, chartStart);
  const chartMap = new Map<string, DayData>();
  for (const d of chartData) chartMap.set(d.date, d);

  const productMap = new Map<string, TopProduct>();
  const paymentMethods = { cash: 0, transfer: 0, check: 0 };

  for (const sale of mySales) {
    const saleDate = sale.date;

    if (saleDate >= currentStart) {
      revCurrent += sale.total;
      salesCurrent++;
      paymentMethods[sale.paymentMethod] += sale.total;

      for (const item of sale.items) {
        const existing = productMap.get(item.variantName);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
        } else {
          productMap.set(item.variantName, { name: item.variantName, quantity: item.quantity, revenue: item.subtotal });
        }
      }
    } else if (saleDate >= prevStart && saleDate <= prevEnd) {
      revPrevious += sale.total;
      salesPrevious++;
    }

    if (saleDate >= chartStart) {
      const key = period === 'year' ? toMonthKey(saleDate) : toDateKey(saleDate);
      const entry = chartMap.get(key);
      if (entry) {
        entry.total += sale.total;
        entry.count++;
      }
    }
  }

  return {
    revenue: { current: revCurrent, previous: revPrevious, change: calcChange(revCurrent, revPrevious) },
    salesCount: { current: salesCurrent, previous: salesPrevious, change: calcChange(salesCurrent, salesPrevious) },
    clientsCount: clients.length,
    inventoryItems: inventory.length,
    inventoryUnits: inventory.reduce((sum, item) => sum + item.quantity, 0),
    salesByDay: chartData,
    paymentMethods,
    topProducts: Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    inventory,
    recentSales: mySales.slice(0, 5),
  };
}
