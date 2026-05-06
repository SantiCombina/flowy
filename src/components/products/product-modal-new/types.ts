import type { Brand, Category, Quality, Presentation } from '@/payload-types';

export type EntityType = 'brand' | 'category' | 'quality' | 'presentation';

export interface EntityDialogState {
  isOpen: boolean;
  type: EntityType | null;
  mode: 'create' | 'edit' | 'delete';
  id?: number;
  currentValue?: string;
}

export interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId?: number;
  brands: Brand[];
  categories: Category[];
  qualities: Quality[];
  presentations: Presentation[];
  onRefreshEntities: () => void;
}

export interface EntitySelectFieldProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: Array<{ id: number; name: string }>;
  entityType: EntityType;
  onCreate: (name: string) => Promise<{ id: number; name: string } | null>;
  onDeleteEntity: (type: EntityType, id: number, name: string) => void;
  emptyMessage?: string;
}

export interface VariantCardProps {
  index: number;
  canDelete: boolean;
  onDelete: (index: number) => void;
  presentations: Presentation[];
  onCreatePresentation: (name: string) => Promise<{ id: number; name: string } | null>;
  onDeletePresentation: (id: number, label: string) => void;
  hasEmptyPresentation: boolean;
  usedPresentationIds: string[];
}
