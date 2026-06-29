'use client';

import { useEffect, useRef } from 'react';

import type { GetSalesListValues } from '@/schemas/sales/sales-list-schema';

const VALID_LIMITS = [25, 50, 100] as const;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parsePage(value: string | null): number {
  const parsed = parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseLimit(value: string | null): 25 | 50 | 100 {
  const parsed = parseInt(value ?? '25', 10);
  return VALID_LIMITS.includes(parsed as 25 | 50 | 100) ? (parsed as 25 | 50 | 100) : 25;
}

function parseOptionalDate(value: string | null): string | undefined {
  if (value === '') return '';
  return value && DATE_REGEX.test(value) ? value : undefined;
}

function parseOptionalPositiveInt(value: string | null): number | undefined {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

const SORT_VALUES = new Set<string>([
  'date',
  'seller',
  'client',
  'items',
  'total',
  'paymentMethod',
  'paymentStatus',
  'deliveryStatus',
  'zone',
]);

const SORT_DIR_VALUES = new Set<string>(['asc', 'desc']);
const PAYMENT_STATUS_VALUES = new Set<string>(['pending', 'collected']);
const PAYMENT_METHOD_VALUES = new Set<string>(['cash', 'transfer', 'check', '__credit__']);
const DELIVERY_STATUS_VALUES = new Set<string>(['pending', 'delivered']);

function parseEnum<T extends string>(value: string | null, valid: Set<string>): T | undefined {
  return value && valid.has(value) ? (value as T) : undefined;
}

export function useSalesUrlSync(state: GetSalesListValues, setState: (state: GetSalesListValues) => void) {
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const setOrDelete = (key: string, value: string | number | undefined | null) => {
      if (value === undefined || value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    };

    const setDateParam = (key: string, value: string | undefined) => {
      if (value === undefined) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    };

    setOrDelete('page', state.page === 1 ? undefined : state.page);
    setOrDelete('limit', state.limit === 25 ? undefined : state.limit);
    setOrDelete('sort', state.sort);
    setOrDelete('sortDir', state.sortDir);
    setDateParam('dateFrom', state.dateFrom);
    setDateParam('dateTo', state.dateTo);
    setOrDelete('paymentStatus', state.paymentStatus);
    setOrDelete('zone', state.zone);
    setOrDelete('paymentMethod', state.paymentMethod);
    setOrDelete('deliveryStatus', state.deliveryStatus);
    params.delete('status');

    const query = params.toString();
    const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [state]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);

      const paymentStatusFromLegacy = params.get('status');
      const paymentStatus =
        parseEnum<NonNullable<GetSalesListValues['paymentStatus']>>(
          params.get('paymentStatus'),
          PAYMENT_STATUS_VALUES,
        ) ||
        parseEnum<NonNullable<GetSalesListValues['paymentStatus']>>(paymentStatusFromLegacy, PAYMENT_STATUS_VALUES);

      setState({
        ...stateRef.current,
        page: parsePage(params.get('page')),
        limit: parseLimit(params.get('limit')),
        sort: parseEnum<NonNullable<GetSalesListValues['sort']>>(params.get('sort'), SORT_VALUES),
        sortDir: parseEnum<NonNullable<GetSalesListValues['sortDir']>>(params.get('sortDir'), SORT_DIR_VALUES),
        dateFrom: parseOptionalDate(params.get('dateFrom')),
        dateTo: parseOptionalDate(params.get('dateTo')),
        paymentStatus,
        zone: parseOptionalPositiveInt(params.get('zone')),
        paymentMethod: parseEnum<NonNullable<GetSalesListValues['paymentMethod']>>(
          params.get('paymentMethod'),
          PAYMENT_METHOD_VALUES,
        ),
        deliveryStatus: parseEnum<NonNullable<GetSalesListValues['deliveryStatus']>>(
          params.get('deliveryStatus'),
          DELIVERY_STATUS_VALUES,
        ),
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setState]);
}
