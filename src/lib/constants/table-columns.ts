export const TABLE_COLUMNS = {
  products: ['name', 'code', 'brand', 'category', 'quality', 'presentation', 'stock', 'price'],
  clients: ['name', 'cuit', 'phone', 'email', 'address', 'localidad', 'provincia'],
  sales: ['date', 'seller', 'client', 'items', 'total', 'paymentMethod', 'paymentStatus'],
  assignments: ['date', 'seller', 'status', 'items', 'notes'],
  history: ['date', 'product', 'type', 'quantity', 'reason', 'reference'],
  sellers: ['name', 'email', 'phone', 'createdAt'],
} as const;

export type TableName = keyof typeof TABLE_COLUMNS;

export type TableColumns = typeof TABLE_COLUMNS;

export const DEFAULT_COLUMNS: Record<TableName, string[]> = {
  products: ['name', 'brand', 'presentation', 'stock', 'price'],
  clients: ['name', 'phone', 'email', 'localidad'],
  sales: ['date', 'seller', 'client', 'total', 'paymentMethod', 'paymentStatus'],
  assignments: ['date', 'seller', 'status'],
  history: ['date', 'product', 'type', 'quantity'],
  sellers: ['name', 'email'],
};

export const MINIMUM_COLUMNS: Record<TableName, string[]> = {
  products: ['name', 'presentation'],
  clients: ['name', 'phone', 'email'],
  sales: ['date', 'total'],
  assignments: ['date', 'seller', 'status'],
  history: ['date', 'product', 'type', 'quantity'],
  sellers: ['name', 'email'],
};

export const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
export type ItemsPerPageOption = (typeof ITEMS_PER_PAGE_OPTIONS)[number];
export const DEFAULT_ITEMS_PER_PAGE: ItemsPerPageOption = 10;

export const COLUMN_LABELS: Record<string, string> = {
  name: 'Nombre',
  code: 'Código',
  brand: 'Marca',
  category: 'Categoría',
  quality: 'Calidad',
  presentation: 'Presentación',
  stock: 'Stock',
  price: 'Precio',
  isActive: 'Estado',
  cuit: 'CUIT/CUIL',
  phone: 'Teléfono',
  email: 'Email',
  address: 'Dirección',
  localidad: 'Localidad',
  provincia: 'Provincia',
  date: 'Fecha',
  client: 'Cliente',
  total: 'Total',
  paymentMethod: 'Método de pago',
  paymentStatus: 'Estado cobro',
  status: 'Estado',
  items: 'Items',
  seller: 'Vendedor',
  notes: 'Notas',
  product: 'Producto',
  type: 'Tipo',
  quantity: 'Cantidad',
  reason: 'Razón',
  reference: 'Referencia',
  createdAt: 'Fecha de creación',
};

export const TABLE_LABELS: Record<TableName, string> = {
  products: 'Productos',
  clients: 'Clientes',
  sales: 'Ventas',
  assignments: 'Asignaciones',
  history: 'Historial',
  sellers: 'Vendedores',
};
