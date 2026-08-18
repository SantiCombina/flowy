'use client';

import { Building2, Filter } from 'lucide-react';

import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type PlanFilterValue = 'all' | 'basic' | 'medium' | 'professional';
export type StateFilterValue = 'all' | 'provisioning' | 'active' | 'blocked';

const PLAN_OPTIONS: Array<{ value: PlanFilterValue; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'basic', label: 'Basic' },
  { value: 'medium', label: 'Medium' },
  { value: 'professional', label: 'Professional' },
];

const STATE_OPTIONS: Array<{ value: StateFilterValue; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'provisioning', label: 'En provisioning' },
  { value: 'active', label: 'Activo' },
  { value: 'blocked', label: 'Bloqueado' },
];

interface TenantsTableToolbarProps {
  search: string;
  planCode: PlanFilterValue;
  state: StateFilterValue;
  onSearchChange: (value: string) => void;
  onPlanCodeChange: (value: PlanFilterValue) => void;
  onStateChange: (value: StateFilterValue) => void;
  totalCount: number;
}

export function TenantsTableToolbar({
  search,
  planCode,
  state,
  onSearchChange,
  onPlanCodeChange,
  onStateChange,
  totalCount,
}: TenantsTableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        className="flex-1 sm:max-w-sm"
        placeholder="Buscar por nombre o email"
        value={search}
        onChange={onSearchChange}
      />

      <div
        className="hidden sm:flex h-9 items-center gap-2 rounded-full bg-white px-4 shadow-sm"
        title="Tenants encontrados"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="text-sm font-semibold text-foreground">{totalCount} tenants</span>
      </div>

      <Select value={planCode} onValueChange={(v) => onPlanCodeChange(v as PlanFilterValue)}>
        <SelectTrigger aria-label="Filtrar por plan" className="h-9 w-auto min-w-35">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Plan" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {PLAN_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={state} onValueChange={(v) => onStateChange(v as StateFilterValue)}>
        <SelectTrigger aria-label="Filtrar por estado" className="h-9 w-auto min-w-35">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          {STATE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
