'use client';

import { SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

  const handleToggle = (columnKey: string, checked: boolean) => {
    const updated = checked ? [...visibleColumns, columnKey] : visibleColumns.filter((c) => c !== columnKey);
    void updateTableColumns(tableName, updated);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <SlidersHorizontal className="h-4 w-4" />
          Columnas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {allColumns.map((columnKey) => {
          const isVisible = visibleColumns.includes(columnKey);
          const label = COLUMN_LABELS[columnKey] ?? columnKey;

          return (
            <DropdownMenuCheckboxItem
              key={columnKey}
              checked={isVisible}
              onCheckedChange={(checked) => handleToggle(columnKey, checked)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
