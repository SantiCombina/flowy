'use server';

import { unstable_cache } from 'next/cache';

import { getClients } from '@/app/services/clients';
import { getMobileSellerInventory, getAllSellersInventoryForOwner } from '@/app/services/mobile-seller';
import type { MobileInventoryItem } from '@/app/services/mobile-seller';
import { getSales } from '@/app/services/sales';
import type { SaleRow } from '@/app/services/sales';
import { getSellers } from '@/app/services/users';
import { cacheTags } from '@/lib/cache-tags';
import {
  DEFAULT_TENANT_TZ,
  getPeriodRangesInTz,
  monthStartInstantInTz,
  shiftDateKey,
  toDateKeyInTz,
  toMonthKeyInTz,
  type Period,
} from '@/lib/datetime';
import { getPayloadClient } from '@/lib/payload';

export type { Period } from '@/lib/datetime';

const tz = DEFAULT_TENANT_TZ;

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
  minimumStock: number;
  imageUrl?: string;
}

export interface OwnerDashboardStats {
  revenue: { current: number; previous: number; change: number };
  salesCount: { current: number; previous: number; change: number };
  clientsTotal: number;
  newClients: { current: number; previous: number; change: number };
  activeProducts: number;
  warehouseVariantsWithStock: number;
  sellersCount: number;
  sellersWithInventory: number;
  totalCollected: number;
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
  newClients: { current: number; previous: number; change: number };
  inventoryItems: number;
  inventoryUnits: number;
  salesByDay: DayData[];
  paymentMethods: { cash: number; transfer: number; check: number };
  topProducts: TopProduct[];
  inventory: MobileInventoryItem[];
  recentSales: SaleRow[];
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function toDateKey(dateStr: string): string {
  return toDateKeyInTz(dateStr, tz);
}

function toMonthKey(dateStr: string): string {
  return toMonthKeyInTz(dateStr, tz);
}

function buildChartData(period: Period, chartStart: string): DayData[] {
  if (period === 'year') {
    const year = toDateKeyInTz(chartStart, tz).slice(0, 4);
    return Array.from({ length: 12 }, (_, i) => ({
      date: `${year}-${String(i + 1).padStart(2, '0')}`,
      total: 0,
      count: 0,
    }));
  }

  const days: DayData[] = [];
  const startKey = toDateKeyInTz(chartStart, tz);
  const todayKey = toDateKeyInTz(new Date(), tz);

  for (let key = startKey; key <= todayKey; key = shiftDateKey(key, 1)) {
    days.push({ date: key, total: 0, count: 0 });
  }
  return days;
}

export async function getOwnerDashboardStats(ownerId: number, period: Period = 'month'): Promise<OwnerDashboardStats> {
  return unstable_cache(
    async (): Promise<OwnerDashboardStats> => {
      const { currentStart, prevStart, prevEnd, chartStart } = getPeriodRangesInTz(new Date(), tz, period);
      const payload = await getPayloadClient();

      const twelveMonthsAgo = monthStartInstantInTz(currentStart, tz, -12);

      const [allSales, clients, sellers, sellersInventory, variantsResult, salePaymentsResult] = await Promise.all([
        getSales({ ownerId, dateFrom: twelveMonthsAgo }),
        getClients({ ownerId }),
        getSellers(ownerId),
        getAllSellersInventoryForOwner(ownerId),
        payload.find({
          collection: 'product-variants',
          where: { owner: { equals: ownerId } },
          depth: 2,
          select: { stock: true, costPrice: true, minimumStock: true, product: true, presentation: true, code: true },
          limit: 1000,
          overrideAccess: true,
        }),
        payload.find({
          collection: 'sale-payments',
          where: { and: [{ owner: { equals: ownerId } }, { date: { greater_than_equal: currentStart } }] },
          pagination: false,
          overrideAccess: true,
        }),
      ]);

      let revCurrent = 0,
        revPrevious = 0,
        salesCurrent = 0,
        salesPrevious = 0,
        totalCollected = 0;

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
          if (sale.paymentMethod) paymentMethods[sale.paymentMethod] += sale.total;

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
              productMap.set(item.variantName, {
                name: item.variantName,
                quantity: item.quantity,
                revenue: item.subtotal,
              });
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

      for (const payment of salePaymentsResult.docs) totalCollected += payment.amount;
      const newClientsCurrent = clients.filter((c) => c.createdAt >= currentStart).length;
      const newClientsPrevious = clients.filter((c) => c.createdAt >= prevStart && c.createdAt <= prevEnd).length;
      const warehouseVariantsWithStock = variantsResult.docs.filter((v) => v.stock > 0).length;
      const activeProducts = variantsResult.docs.length;

      const lowStockAlerts: LowStockAlert[] = variantsResult.docs
        .filter((v) => (v.minimumStock ?? 0) > 0 && v.stock <= (v.minimumStock ?? 0))
        .map((v) => {
          const product = typeof v.product === 'object' ? v.product : null;
          const presentation = v.presentation && typeof v.presentation === 'object' ? v.presentation : null;
          const image = product?.image && typeof product.image === 'object' ? product.image : null;
          return {
            name: product?.name ?? 'Producto desconocido',
            presentation: presentation?.label ?? undefined,
            code: v.code ?? undefined,
            stock: v.stock,
            minimumStock: v.minimumStock ?? 0,
            imageUrl: image?.url ?? undefined,
          };
        })
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 10);

      return {
        revenue: { current: revCurrent, previous: revPrevious, change: calcChange(revCurrent, revPrevious) },
        salesCount: { current: salesCurrent, previous: salesPrevious, change: calcChange(salesCurrent, salesPrevious) },
        clientsTotal: clients.length,
        newClients: {
          current: newClientsCurrent,
          previous: newClientsPrevious,
          change: calcChange(newClientsCurrent, newClientsPrevious),
        },
        activeProducts,
        warehouseVariantsWithStock,
        sellersCount: sellers.length,
        sellersWithInventory: sellersInventory.length,
        totalCollected,
        salesByDay: chartData,
        salesBySeller: Array.from(sellerMap.values()).sort((a, b) => b.total - a.total),
        paymentMethods,
        topProducts: Array.from(productMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        lowStockAlerts,
        recentSales: allSales.slice(0, 5),
      };
    },
    [`owner-dashboard-${ownerId}-${period}`],
    {
      revalidate: 60 * 5,
      tags: [cacheTags.dashboard(), String(ownerId), period],
    },
  )();
}

export async function getSellerDashboardStats(
  sellerId: number,
  ownerId: number,
  period: Period = 'month',
): Promise<SellerDashboardStats> {
  return unstable_cache(
    async (): Promise<SellerDashboardStats> => {
      const { currentStart, prevStart, prevEnd, chartStart } = getPeriodRangesInTz(new Date(), tz, period);

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
          if (sale.paymentMethod) paymentMethods[sale.paymentMethod] += sale.total;

          for (const item of sale.items) {
            const existing = productMap.get(item.variantName);
            if (existing) {
              existing.quantity += item.quantity;
              existing.revenue += item.subtotal;
            } else {
              productMap.set(item.variantName, {
                name: item.variantName,
                quantity: item.quantity,
                revenue: item.subtotal,
              });
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

      const newClientsCurrent = clients.filter((c) => c.createdAt >= currentStart).length;
      const newClientsPrevious = clients.filter((c) => c.createdAt >= prevStart && c.createdAt <= prevEnd).length;

      return {
        revenue: { current: revCurrent, previous: revPrevious, change: calcChange(revCurrent, revPrevious) },
        salesCount: { current: salesCurrent, previous: salesPrevious, change: calcChange(salesCurrent, salesPrevious) },
        clientsCount: clients.length,
        newClients: {
          current: newClientsCurrent,
          previous: newClientsPrevious,
          change: calcChange(newClientsCurrent, newClientsPrevious),
        },
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
    },
    [`seller-dashboard-${sellerId}-${period}`],
    {
      revalidate: 60 * 5,
      tags: [cacheTags.dashboard(), String(ownerId), String(sellerId), period],
    },
  )();
}
