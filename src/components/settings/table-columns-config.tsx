'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TABLE_COLUMNS, COLUMN_LABELS, MINIMUM_COLUMNS, type TableName } from '@/lib/constants/table-columns';

interface TableColumnsConfigProps {
  tableName: TableName;
  initialColumns: string[];
  onSave: (columns: string[]) => Promise<void>;
}

export function TableColumnsConfig({ tableName, initialColumns, onSave }: TableColumnsConfigProps) {
  const [columns, setColumns] = useState<string[]>(initialColumns);
  const [isSaving, setIsSaving] = useState(false);

  const availableColumns = TABLE_COLUMNS[tableName];

  const handleToggle = (column: string) => {
    setColumns((prev) => {
      if (prev.includes(column)) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== column);
      }
      return [...prev, column];
    });
  };

  const handleSelectAll = () => {
    setColumns([...availableColumns]);
  };

  const handleSelectMinimum = () => {
    setColumns([...MINIMUM_COLUMNS[tableName]]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(columns);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(columns.sort()) !== JSON.stringify(initialColumns.sort());

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Selecciona las columnas que deseas ver en la tabla de {tableName}. Debe haber al menos una columna seleccionada.
      </p>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          disabled={columns.length === availableColumns.length}
        >
          Seleccionar todas
        </Button>
        <Button variant="outline" size="sm" onClick={handleSelectMinimum} disabled={columns.length === 3}>
          Mínimo
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {availableColumns.map((column) => (
          <div key={column} className="flex items-center space-x-2">
            <Checkbox
              id={`${tableName}-${column}`}
              checked={columns.includes(column)}
              onCheckedChange={() => handleToggle(column)}
              disabled={columns.length === 1 && columns.includes(column)}
            />
            <Label htmlFor={`${tableName}-${column}`} className="text-sm font-normal cursor-pointer">
              {COLUMN_LABELS[column] || column}
            </Label>
          </div>
        ))}
      </div>

      {hasChanges && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      )}
    </div>
  );
}
