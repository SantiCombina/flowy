# Flowy - Agent Instructions

## Project Overview

Flowy es un sistema de gestión de inventario y ventas para distribuidoras, diseñado para reemplazar hojas de Excel desordenadas por una plataforma moderna donde los owners puedan gestionar su inventario, vendedores y ventas en tiempo real.

**Visión futura**: SaaS multi-tenant donde cada owner gestiona su propio negocio.

---

## Technology Stack

| Tecnología       | Versión | Uso                              |
| ---------------- | ------- | -------------------------------- |
| Next.js          | 15.x    | Framework principal (App Router) |
| Payload CMS      | 3.75.x  | Backend, Auth, Admin Panel       |
| PostgreSQL       | -       | Base de datos (Neon.tech)        |
| Tailwind CSS     | 4.x     | Estilos                          |
| shadcn/ui        | -       | Componentes UI                   |
| Zod              | 3.x     | Validación                       |
| next-safe-action | 8.x     | Server Actions tipados           |
| React Hook Form  | 7.x     | Formularios                      |
| Resend           | -       | Envío de emails                  |
| UploadThing      | -       | Almacenamiento de archivos       |

---

## Project Structure

```
src/
├── app/
│   ├── (frontend)/              # Rutas del frontend
│   │   ├── (auth)/              # Login, registro
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (main)/              # Rutas protegidas
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── products/page.tsx
│   │   │   ├── sellers/page.tsx
│   │   │   ├── assignments/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   ├── sales/page.tsx
│   │   │   ├── statistics/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css          # Tailwind + variables CSS
│   ├── (payload)/               # Admin panel de Payload (no modificar)
│   └── services/                # Servicios de datos
│       ├── settings.ts
│       ├── users.ts
│       └── invitations.ts
├── collections/                 # Definiciones de colecciones Payload
│   ├── Users.ts
│   ├── Invitations.ts
│   ├── Media.ts
│   ├── Products.ts
│   ├── Brands.ts
│   ├── Categories.ts
│   ├── Qualities.ts
│   ├── Presentations.ts
│   ├── ProductVariants.ts
│   ├── ProductCustomFields.ts
│   ├── Clients.ts
│   └── Settings.ts
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── layout/                  # AppLayout, Sidebar, PageHeader
│   ├── auth/                    # LoginForm, RegisterForm
│   ├── settings/                # Configuración de columnas
│   └── providers/               # UserProvider
├── contexts/
│   └── settings-context.tsx     # Contexto de configuración
├── lib/
│   ├── features.ts              # Feature flags
│   ├── payload.ts               # Cliente Payload
│   ├── safe-action.ts           # Cliente next-safe-action
│   ├── utils.ts                 # Utilidades (cn, etc.)
│   └── constants/
│       └── table-columns.ts     # Configuración de columnas
├── hooks/
│   └── use-mobile.ts            # Hook para mobile
├── payload.config.ts            # Configuración de Payload
├── payload-types.ts             # Tipos generados automáticamente
└── middleware.ts                # Protección de rutas y feature flags
```

---

## Build and Development Commands

```bash
# Desarrollo
pnpm dev              # Inicia servidor de desarrollo
pnpm devsafe          # Limpia .next y reinicia

# Build
pnpm build            # Build de producción
pnpm start            # Inicia servidor de producción

# Linting
pnpm lint             # Ejecuta ESLint
pnpm lint:fix         # Corrige errores automáticamente

# Payload
pnpm generate:types   # Genera tipos de Payload (IMPORTANTE después de cambios en colecciones)
pnpm generate:importmap  # Regenera import map
pnpm payload          # CLI de Payload
```

**Nota**: Después de modificar cualquier colección en Payload, SIEMPRE ejecutar `pnpm generate:types` para actualizar los tipos en `src/payload-types.ts`.

---

## User Roles and Permissions

| Rol      | Permisos                                                                    |
| -------- | --------------------------------------------------------------------------- |
| `admin`  | Acceso total. Gestiona owners. Solo desarrolladores.                        |
| `owner`  | Gestiona SU negocio: productos, vendedores, asignaciones, clientes, ventas. |
| `seller` | Registra ventas y clientes. Ve solo sus asignaciones.                       |

### Access Control Pattern

Todas las colecciones deben filtrar por owner:

```typescript
access: {
  read: ({ req: { user } }) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'owner') {
      return { owner: { equals: user.id } };
    }
    if (user?.role === 'seller') {
      return { owner: { equals: user.owner } };
    }
    return false;
  },
}
```

---

## Feature Flags

El proyecto usa feature flags en `.env` para habilitar/deshabilitar funcionalidades:

```env
FEATURE_PRODUCTS=true
FEATURE_SELLERS=true
FEATURE_ASSIGNMENTS=true
FEATURE_HISTORY=true
FEATURE_SALES=true
FEATURE_STATISTICS=true
FEATURE_SETTINGS=true
```

Las rutas protegidas por feature flags se definen en `src/middleware.ts`.

---

## Coding Conventions

### TypeScript

**REGLAS ESTRICTAS:**
- **SIEMPRE** usar tipos de `src/payload-types.ts` para entidades de Payload
- **NUNCA** usar `any` (eslint: `@typescript-eslint/no-explicit-any: error`)
- **EVITAR** usar `as` - Preferir type guards y validación explícita
- Solo usar `as` cuando sea absolutamente necesario (ej: `result.docs as Brand[]` en respuestas de Payload)
- Preferir interfaces sobre types para objetos
- No usar `console.log` en producción (permitido en desarrollo)

**Ejemplo correcto:**
```typescript
import type { Brand, Product } from '@/payload-types';

export async function getBrands(ownerId: number): Promise<Brand[]> {
  const result = await payload.find({ collection: 'brands' });
  return result.docs as Brand[]; // ✅ Permitido: casting de Payload response
}
```

**Ejemplo incorrecto:**
```typescript
const brand: any = await getBrand(); // ❌ NUNCA usar any
const product = data as Product; // ❌ EVITAR as innecesario
```

### Code Quality

**⚠️ PROHIBIDO dejar comentarios en el código**
- El código debe ser auto-explicativo
- Usar nombres descriptivos de variables y funciones
- Si necesitas explicar algo, el código necesita refactorizarse
- **NO** usar comentarios para explicar qué hace el código
- Excepciones: JSDoc para funciones públicas de servicios (solo cuando sea necesario para documentación)

### Components

**Server Components por defecto:**
- **SIEMPRE** usar `'use server'` cuando sea posible
- **Solo** usar `'use client'` cuando sea estrictamente necesario:
  - Event listeners (onClick, onChange, etc.)
  - React hooks (useState, useEffect, useContext)
  - Browser APIs (window, localStorage, etc.)
  - Librerías que requieren client-side (react-hook-form, etc.)
- **Componentizar al máximo** - Separar lógica de cliente de servidor
- Props con interfaces nombradas `[Component]Props`

**Ejemplo de componentización:**
```typescript
// ✅ CORRECTO: Page es Server Component, Form es Client Component
// app/products/page.tsx
export default async function ProductsPage() {
  const products = await getProducts(); // Server-side
  return <ProductsSection products={products} />;
}

// components/products/products-section.tsx
'use client';
export function ProductsSection({ products }: ProductsSectionProps) {
  // Client-side: interactividad
}
```

### UI Components

**SIEMPRE usar shadcn/ui:**
- Todos los componentes base deben ser de shadcn/ui (`src/components/ui/`)
- No crear componentes UI propios si existe equivalente en shadcn
- Importar y usar directamente: `import { Button } from '@/components/ui/button'`

**SIEMPRE usar Lucide React para iconos:**
- Importar de `lucide-react`
- No usar SVGs inline
- No usar otras librerías de iconos

```typescript
// ✅ CORRECTO
import { PackagePlus, Pencil, Trash2 } from 'lucide-react';

// ❌ INCORRECTO
<svg>...</svg> // No usar SVG inline
import { FaIcon } from 'react-icons'; // No usar otras librerías
```

### Forms

**SIEMPRE usar shadcn Form + React Hook Form + Zod:**
- Componente `Form` de shadcn/ui
- `react-hook-form` para manejo de estado
- `zod` como resolver para validación
- Usar `zodResolver` de `@hookform/resolvers/zod`

**Pattern obligatorio:**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
});

export function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}
```

### Zod Schemas - Patrón de Validación Detallada

**UBICACIÓN Y ORGANIZACIÓN:**
- Todos los schemas en `src/schemas/[feature]/`
- Un archivo por tipo de schema (ej: `login-schema.ts`, `product-schema.ts`)
- **NUNCA crear archivos `index.ts` de re-exportación**
- Importaciones directas desde archivos específicos

**Estructura de directorios:**
```
src/schemas/
├── auth/
│   ├── login-schema.ts
│   └── register-schema.ts
├── products/
│   ├── product-schema.ts
│   └── product-actions-schema.ts
├── sellers/
│   ├── invite-seller-schema.ts
│   └── edit-seller-schema.ts
└── stock-movements/
    └── stock-movement-schema.ts
```

**PATRÓN OBLIGATORIO - Seguridad en Validaciones:**

Todos los schemas DEBEN incluir:
1. `required_error` e `invalid_type_error` en TODOS los campos
2. `.trim()` en TODOS los strings (sanitización)
3. `.max()` con límite de caracteres en TODOS los strings
4. Mensajes descriptivos en español
5. Export del tipo inferido

**Ejemplo completo de schema:**

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({
      required_error: 'El email es requerido.',
      invalid_type_error: 'El email debe ser una cadena de texto.',
    })
    .trim()
    .email({
      message: 'Por favor ingresa una dirección de email válida.',
    }),
  password: z
    .string({
      required_error: 'La contraseña es requerida.',
      invalid_type_error: 'La contraseña debe ser una cadena de texto.',
    })
    .min(1, {
      message: 'La contraseña es requerida.',
    }),
});

export type LoginValues = z.infer<typeof loginSchema>;
```

**Validaciones específicas por tipo:**

```typescript
// STRING con longitud - SIEMPRE trim + max
name: z
  .string({
    required_error: 'El nombre es requerido.',
    invalid_type_error: 'El nombre debe ser una cadena de texto.',
  })
  .trim()
  .min(1, {
    message: 'El nombre es requerido.',
  })
  .max(100, {
    message: 'El nombre debe tener como máximo 100 caracteres.',
  }),

// PASSWORD - Sin espacios, min 8, max 100
password: z
  .string({
    required_error: 'La contraseña es requerida.',
    invalid_type_error: 'La contraseña debe ser una cadena de texto.',
  })
  .min(8, {
    message: 'La contraseña debe tener al menos 8 caracteres.',
  })
  .max(100, {
    message: 'La contraseña debe tener como máximo 100 caracteres.',
  })
  .refine((val) => !val.includes(' '), {
    message: 'La contraseña no puede contener espacios.',
  }),

// NUMBER positivo
quantity: z
  .number({
    required_error: 'La cantidad es requerida.',
    invalid_type_error: 'La cantidad debe ser un número.',
  })
  .min(0.01, {
    message: 'La cantidad debe ser mayor a 0.',
  }),

// BOOLEAN
isActive: z.boolean({
  required_error: 'El estado es requerido.',
  invalid_type_error: 'El estado debe ser un valor booleano.',
}),

// OPCIONAL - Usar optional() o or(z.literal(''))
phone: z
  .string({
    invalid_type_error: 'El teléfono debe ser una cadena de texto.',
  })
  .max(20, {
    message: 'El teléfono debe tener como máximo 20 caracteres.',
  })
  .optional()
  .or(z.literal('')),

// REGEX - Con mensaje descriptivo
dni: z
  .string({
    invalid_type_error: 'El DNI debe ser una cadena de texto.',
  })
  .regex(/^\d{7,8}$/, {
    message: 'El DNI debe tener 7 u 8 dígitos.',
  })
  .optional()
  .or(z.literal('')),

// ENUM - Con mensajes personalizados
type: z.enum(['entry', 'exit', 'adjustment'], {
  required_error: 'El tipo de movimiento es requerido.',
  invalid_type_error: 'El tipo de movimiento debe ser entry, exit o adjustment.',
}),

// ARRAY - Con validación de elementos
columns: z
  .array(
    z.string({
      required_error: 'Cada columna debe ser una cadena de texto.',
      invalid_type_error: 'Cada columna debe ser una cadena de texto.',
    }),
    {
      required_error: 'Las columnas son requeridas.',
      invalid_type_error: 'Las columnas deben ser un array.',
    },
  )
  .min(1, {
    message: 'Debe seleccionar al menos una columna.',
  }),
```

**Importaciones - SIEMPRE directas:**

```typescript
// ✅ CORRECTO - Importación directa
import { loginSchema, type LoginValues } from '@/schemas/auth/login-schema';
import { productSchema } from '@/schemas/products/product-schema';

// ❌ INCORRECTO - NO usar index.ts
import { loginSchema } from '@/schemas';
import { productSchema } from '@/schemas/products';
```

**Schemas para Server Actions:**

Cuando necesites schemas adicionales para actions (con campos extra como `id`), defínelos en el mismo archivo:

```typescript
export const editSellerSchema = z.object({
  name: z.string({ ... }).trim().min(1).max(100),
  email: z.string({ ... }).trim().email(),
  // ... otros campos
});

export type EditSellerValues = z.infer<typeof editSellerSchema>;

// Schema extendido para la action
export const updateSellerActionSchema = editSellerSchema.extend({
  id: z.number({
    required_error: 'El ID es requerido.',
    invalid_type_error: 'El ID debe ser un número.',
  }),
});

export type UpdateSellerActionValues = z.infer<typeof updateSellerActionSchema>;
```

**⚠️ REGLAS CRÍTICAS:**
1. **NUNCA** omitir `required_error` e `invalid_type_error`
2. **SIEMPRE** usar `.trim()` en strings antes de otras validaciones
3. **SIEMPRE** limitar longitud con `.max()` en strings
4. **NUNCA** crear archivos `index.ts` de re-exportación
5. **SIEMPRE** exportar el tipo inferido con `export type`
6. **SIEMPRE** mensajes de error en español descriptivos

### Server Actions Architecture

**ARQUITECTURA OBLIGATORIA DE TRES CAPAS:**

```
Client Component -> Server Action -> Service Layer
     (useAction)    (auth/validation)  (business logic)
```

#### 1. Service Layer (`src/app/services/[entity].ts`)

**TODA la lógica de negocio va aquí:**

- **Ubicación**: Un archivo por colección en `src/app/services/`
- **Contenido**: ÚNICAMENTE lógica de negocio y operaciones de base de datos
- **Sin**: Autenticación, validación, o autorización (eso va en actions)

```typescript
'use server';

import { getPayloadClient } from '@/lib/payload';
import type { Brand } from '@/payload-types';

export async function getBrands(ownerId: number): Promise<Brand[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'brands',
    where: { owner: { equals: ownerId } },
    sort: 'name',
    limit: 1000,
    overrideAccess: true,
  });

  return result.docs as Brand[];
}

export async function createBrand(name: string, ownerId: number): Promise<Brand> {
  const payload = await getPayloadClient();

  const brand = await payload.create({
    collection: 'brands',
    data: { name, owner: ownerId },
    overrideAccess: true,
  });

  return brand as Brand;
}
```

**Reglas del Service Layer:**
- Sin autenticación (recibe ownerId como parámetro)
- Sin validación (recibe datos ya validados)
- Solo lógica de base de datos y negocio
- Funciones puras y testeables
- NUNCA llamar a otros actions, solo a otros servicios

#### 2. Action Layer (`src/components/[feature]/actions.ts`)

**Solo autenticación, autorización y validación:**

- **Ubicación**: Archivo `actions.ts` en la carpeta del feature que lo usa
  - Ejemplo: `src/components/products/actions.ts`
  - Ejemplo: `src/components/sellers/actions.ts`
- **Usar SIEMPRE**: `actionClient` de next-safe-action
- **Contenido**: Auth + Validation + Llamada a servicios
- **Schemas**: Importar desde `@/schemas/[feature]/` (NUNCA definir inline)

```typescript
'use server';

import { createBrand } from '@/app/services/entities';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { createEntitySchema } from '@/schemas/products/product-actions-schema';

export const createBrandAction = actionClient
  .schema(createEntitySchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    const brand = await createBrand(parsedInput.name, user.id);
    return { success: true, brand };
  });
```

**Reglas del Action Layer:**
- SIEMPRE usar `actionClient` de next-safe-action
- Importar schemas desde `@/schemas/[feature]/[schema-file]`
- NUNCA definir schemas inline en actions
- Validar con `.schema()` de Zod
- Autenticar con `getCurrentUser()`
- Autorizar según roles
- Llamar a servicios para lógica de negocio
- Retornar `{ success: true, ...data }` o lanzar errores
- NUNCA lógica de negocio directa

#### 3. Client Components (uso con `useAction`)

**❌ INCORRECTO - Llamada directa:**

```typescript
const result = await createBrandAction({ name });
if (result?.serverError) {
  toast.error(result.serverError);
}
```

**✅ CORRECTO - Usar hook `useAction` con `executeAsync`:**

```typescript
import { useAction } from 'next-safe-action/hooks';
import { createBrandAction } from './actions';

export function BrandForm() {
  const { executeAsync, isExecuting } = useAction(createBrandAction);

  const handleSubmit = async (data: FormData) => {
    const result = await executeAsync({ name: data.get('name') as string });
    
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Marca creada');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <button disabled={isExecuting}>Crear</button>
    </form>
  );
}
```

**Reglas de Client Components:**
- **SIEMPRE** usar `useAction` hook, NUNCA llamar actions directamente
- **SIEMPRE** desestructurar `executeAsync` e `isExecuting` del hook
- Validar `serverError` antes de `data`
- Usar `isExecuting` para estados de carga
- Manejar errores con toast/UI apropiada

#### ⚠️ Errores Comunes a Evitar

```typescript
// ❌ NO: Lógica de negocio en actions
export const createBrandAction = actionClient
  .schema(schema)
  .action(async ({ parsedInput }) => {
    const payload = await getPayloadClient();
    const brand = await payload.create({ ... });
    return brand;
  });

// ❌ NO: Llamada directa sin useAction
const result = await createBrandAction({ name });

// ❌ NO: Servicios con autenticación
export async function createBrand() {
  const user = await getCurrentUser();
  ...
}

// ✅ SÍ: Separación clara de responsabilidades
Service: Lógica de DB
Action: Auth + Validation + Llamada a Service
Component: useAction + UI
```
Action: Auth + Validation + Llamada a Service
Component: useAction + UI
```

### Data Fetching

#### Server Components (RSC)

```typescript
import { getProducts } from '@/app/services/products';
import { getCurrentUser } from '@/lib/payload';

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  
  const products = await getProducts(user.id);
  
  return <ProductList products={products} />;
}
```

**Reglas:**
- Fetch directo usando servicios
- Autenticar en el componente si es necesario
- No usar `useEffect` para data fetching inicial
- Pasar datos como props a Client Components

#### Client Components (Mutaciones)

```typescript
'use client';

import { useAction } from 'next-safe-action/hooks';
import { createProductAction } from './actions';

export function ProductForm() {
  const { executeAsync, isExecuting } = useAction(createProductAction);
  
  const onSubmit = async (data) => {
    const result = await executeAsync(data);
    if (result?.data?.success) {
      router.refresh();
    }
  };
}
```

**Reglas:**
- Mutaciones con Server Actions usando `useAction`
- Revalidación con `router.refresh()` o `revalidatePath`
- Estados de carga con `isExecuting`
- NUNCA useEffect para mutations

### Services Pattern

**Estructura estándar de servicios:**

```typescript
'use server';

import { getPayloadClient } from '@/lib/payload';
import type { Entity } from '@/payload-types';

export async function getAll(ownerId: number): Promise<Entity[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'entities',
    where: { owner: { equals: ownerId } },
    sort: 'name',
    overrideAccess: true,
  });
  return result.docs as Entity[];
}

export async function getById(id: number): Promise<Entity | null> {
  const payload = await getPayloadClient();
  try {
    const entity = await payload.findByID({
      collection: 'entities',
      id,
      overrideAccess: true,
    });
    return entity as Entity;
  } catch {
    return null;
  }
}

export async function create(data: CreateData, ownerId: number): Promise<Entity> {
  const payload = await getPayloadClient();
  const entity = await payload.create({
    collection: 'entities',
    data: { ...data, owner: ownerId },
    overrideAccess: true,
  });
  return entity as Entity;
}

export async function update(id: number, data: UpdateData): Promise<Entity> {
  const payload = await getPayloadClient();
  const entity = await payload.update({
    collection: 'entities',
    id,
    data,
    overrideAccess: true,
  });
  return entity as Entity;
}

export async function remove(id: number): Promise<void> {
  const payload = await getPayloadClient();
  await payload.delete({
    collection: 'entities',
    id,
    overrideAccess: true,
  });
}
```

**Características clave:**
- Siempre `'use server'` al inicio
- Tipos explícitos en parámetros y retornos
- `overrideAccess: true` (la seguridad se maneja en actions)
- Manejo de errores con try/catch donde corresponda
- Sin lógica de autenticación (recibe ownerId)
- Operaciones atómicas y claras

### Styling

- Tailwind CSS con variables CSS
- Colores definidos en `src/app/(frontend)/globals.css`
- Mobile-first approach
- Usar clase `cn()` de `@/lib/utils` para condicionales

---

## Security Considerations

### CRÍTICO: Local API Access Control

```typescript
// ❌ BUG DE SEGURIDAD: Bypass de access control
await payload.find({
  collection: 'posts',
  user: someUser,
});

// ✅ SEGURO: Aplica permisos del usuario
await payload.find({
  collection: 'posts',
  user: someUser,
  overrideAccess: false, // REQUERIDO
});
```

### Transaction Safety en Hooks

```typescript
// ❌ RIESGO: Transacción separada
hooks: {
  afterChange: [
    async ({ doc, req }) => {
      await req.payload.create({
        collection: 'audit-log',
        data: { docId: doc.id },
        // Falta req - corre en transacción separada!
      });
    },
  ],
}

// ✅ ATÓMICO: Misma transacción
hooks: {
  afterChange: [
    async ({ doc, req }) => {
      await req.payload.create({
        collection: 'audit-log',
        data: { docId: doc.id },
        req, // Mantiene atomicidad
      });
    },
  ],
}
```

### Authentication

- El middleware (`src/middleware.ts`) protege rutas basado en cookie `payload-token`
- Rutas públicas: `/login`, `/register`
- Payload Auth con sesiones HTTP-only

---

## ⚠️ METODOLOGÍA OBLIGATORIA

### Consultar Antes de Implementar

**NUNCA implementar código sin consultar primero cuando:**

- Vayas a crear o modificar una colección de Payload
- Necesites definir estructura de datos
- Tengas que decidir validaciones o reglas de negocio
- Debas configurar access control

**Proceso obligatorio:**

1. **Proponer** la estructura basada en `docs/PLAN.md`
2. **Preguntar** al usuario sobre campos, tipos, validaciones
3. **Esperar confirmación** explícita
4. **Solo entonces** proceder a implementar

Las estructuras en `docs/PLAN.md` son **propuestas iniciales**, NO instrucciones finales.

### Arquitectura de Código

**SIEMPRE seguir esta arquitectura:**

1. **Services** (`src/app/services/`): Lógica de negocio pura
2. **Actions** (`src/components/[feature]/actions.ts`): Auth + Validation + Llamadas a services
3. **Components**: Usar `useAction` hook, nunca llamadas directas
4. **NO comentarios**: Código auto-explicativo, nombres descriptivos
5. **TypeScript estricto**: Tipos explícitos, sin `any`

**Si ves código que no sigue esta arquitectura, refáctoralo.**

---

## Collections Reference

### Users
- Autenticación con Payload Auth
- Roles: admin, owner, seller
- Relación owner-seller para vendedores

### Products
- Catálogo de productos
- Relaciones: Brand, Category, Quality
- Código único (SKU)

### Settings
- Configuración por usuario
- Columnas visibles por tabla
- Elementos por página

### Invitations
- Sistema de invitaciones por email
- Tokens de un solo uso
- Integración con Resend

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Payload
PAYLOAD_SECRET=...

# Email (Resend)
RESEND_API_KEY=...
EMAIL_FROM=...

# File Storage (UploadThing)
UPLOADTHING_TOKEN=...

# App
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Feature Flags
FEATURE_PRODUCTS=true
FEATURE_SELLERS=true
...
```

---

## Path Aliases

```typescript
// tsconfig.json paths
"@/*": ["./src/*"]
"@payload-config": ["./src/payload.config.ts"]

// Ejemplos de uso
import { Button } from '@/components/ui/button';
import { getSettings } from '@/app/services/settings';
import config from '@payload-config';
```

---

## References

- `docs/PLAN.md` - Roadmap y plan de desarrollo
