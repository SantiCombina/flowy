'use client';

import { SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FilterSheet } from '@/components/ui/filter-sheet';
import { useSettings } from '@/contexts/settings-context';
import { COLUMN_LABELS, TABLE_COLUMNS, type TableName } from '@/lib/constants/table-columns';

interface ColumnVisibilityDropdownProps {
  tableName: TableName;
  excludeColumns?: string[];
}

export function ColumnVisibilityDropdown({ tableName, excludeColumns = [] }: ColumnVisibilityDropdownProps) {
  const { getVisibleColumns, updateTableColumns } = useSettings();

  const allColumns = (TABLE_COLUMNS[tableName] as readonly string[]).filter((c) => !excludeColumns.includes(c));
  const visibleColumns = getVisibleColumns(tableName);

  const items = allColumns.map((columnKey) => ({
    key: columnKey,
    label: COLUMN_LABELS[columnKey] ?? columnKey,
    checked: visibleColumns.includes(columnKey),
    onToggle: (checked: boolean) => {
      const updated = checked ? [...visibleColumns, columnKey] : visibleColumns.filter((c) => c !== columnKey);
      void updateTableColumns(tableName, updated);
    },
  }));

  return (
    <FilterSheet
      title="Columnas visibles"
      align="end"
      trigger={
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <SlidersHorizontal className="h-4 w-4" />
          Columnas
        </Button>
      }
      items={items}
    />
  );
}
