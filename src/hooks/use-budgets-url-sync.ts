'use client';

import { useEffect, useRef } from 'react';

import { budgetsUrlConstants, parseEnum, parseLimit, parseOptionalDate, parsePage } from '@/lib/budgets-url-utils';
import type { GetBudgetsListValues } from '@/schemas/budgets/budget-list-schema';

export function useBudgetsUrlSync(state: GetBudgetsListValues, setState: (state: GetBudgetsListValues) => void) {
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

    setOrDelete('page', state.page === 1 ? undefined : state.page);
    setOrDelete('limit', state.limit === 25 ? undefined : state.limit);
    setOrDelete('sort', state.sort);
    setOrDelete('sortDir', state.sortDir);
    setOrDelete('dateFrom', state.dateFrom);
    setOrDelete('dateTo', state.dateTo);
    setOrDelete('status', state.status);

    const query = params.toString();
    const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [state]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);

      setState({
        ...stateRef.current,
        page: parsePage(params.get('page')),
        limit: parseLimit(params.get('limit')),
        sort: parseEnum<NonNullable<GetBudgetsListValues['sort']>>(params.get('sort'), budgetsUrlConstants.SORT_VALUES),
        sortDir: parseEnum<NonNullable<GetBudgetsListValues['sortDir']>>(
          params.get('sortDir'),
          budgetsUrlConstants.SORT_DIR_VALUES,
        ),
        dateFrom: parseOptionalDate(params.get('dateFrom')),
        dateTo: parseOptionalDate(params.get('dateTo')),
        status: parseEnum<NonNullable<GetBudgetsListValues['status']>>(
          params.get('status'),
          budgetsUrlConstants.STATUS_VALUES,
        ),
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setState]);
}
