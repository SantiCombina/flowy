# Flowy — Claude Code Instructions

Flowy es un sistema de gestión de inventario y ventas para distribuidoras. SaaS multi-tenant donde owners gestionan productos, vendedores y stock.

## Stack

| Tecnología       | Versión | Uso                              |
| ---------------- | ------- | -------------------------------- |
| Next.js          | 15.x    | Framework (App Router)           |
| Payload CMS      | 3.75.x  | Backend, Auth, Admin Panel       |
| PostgreSQL       | -       | Base de datos (Neon.tech)        |
| Tailwind CSS     | 4.x     | Estilos                          |
| shadcn/ui        | -       | Componentes UI                   |
| Zod              | 3.x     | Validación                       |
| next-safe-action | 8.x     | Server Actions tipados           |
| React Hook Form  | 7.x     | Formularios                      |
| Resend           | -       | Emails                           |
| UploadThing      | -       | Almacenamiento de archivos       |

## Roles y Jerarquía

| Rol      | Permisos                                                    |
| -------- | ----------------------------------------------------------- |
| `admin`  | Acceso total. Gestiona owners. Solo desarrolladores.        |
| `owner`  | Gestiona SU negocio: productos, vendedores, stock, clientes |
| `seller` | `fixed` (trabaja en depósito) o `mobile` (lleva stock)      |

## Estructura del Proyecto

```
src/
├── app/
│   ├── (frontend)/
│   │   ├── (auth)/          # login, register
│   │   └── (main)/          # rutas protegidas (dashboard, products, sellers...)
│   ├── (payload)/           # Admin panel (NO modificar)
│   └── services/            # Servicios de datos ('use server')
├── collections/             # Colecciones Payload CMS
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── [feature]/           # actions.ts + componentes por feature
├── schemas/                 # Zod schemas por feature
├── lib/
│   ├── safe-action.ts       # actionClient
│   ├── payload.ts           # getPayloadClient, getCurrentUser
│   └── constants/
│       └── table-columns.ts
├── payload.config.ts
└── payload-types.ts         # AUTO-GENERADO — no editar
```

## Comandos Esenciales

```bash
pnpm dev                                           # desarrollo
pnpm devsafe                                       # limpia .next y reinicia
pnpm generate:types                                # SIEMPRE después de cambiar colecciones
pnpm generate:importmap                            # después de agregar components a Payload
pnpm payload migrate:create --name=<name>          # nueva migración
pnpm payload migrate                               # aplicar migraciones
tsc --noEmit                                       # validar TypeScript
```

## Arquitectura Obligatoria (3 capas)

```
Client Component → Action Layer → Service Layer
  (useAction)      (auth+validación)  (lógica DB)
```

### Service Layer (`src/app/services/[entity].ts`)
- `'use server'` siempre
- Solo lógica de DB. Sin auth, sin validación.
- Recibe `ownerId` como parámetro
- `overrideAccess: true` (la seguridad va en actions)

### Action Layer (`src/components/[feature]/actions.ts`)
- Usa `actionClient` de `@/lib/safe-action`
- Auth con `getCurrentUser()` + validación de rol
- Schema importado desde `@/schemas/[feature]/` (NUNCA inline)
- Llama al service, retorna `{ success: true, ...data }`

### Client Components
- **SIEMPRE** `useAction` hook, NUNCA llamar actions directamente
- Desestructurar `executeAsync` e `isExecuting`
- Validar `result?.serverError` antes de `result?.data`

## Convenciones TypeScript

- **NUNCA** `any` — eslint lo bloquea
- **EVITAR** `as` — solo permitido para castear respuestas de Payload (`result.docs as Brand[]`)
- Tipos de `src/payload-types.ts` para entidades Payload
- Interfaces sobre types para objetos
- Sin `console.log` en producción

## Convenciones de Código

- **SIN comentarios** en el código — el código debe ser auto-explicativo
- Server Components por defecto; `'use client'` solo cuando hay state/events/browser APIs
- Componentizar: lógica de server vs client en archivos separados

## Schemas Zod (`src/schemas/[feature]/[name]-schema.ts`)

- `required_error` e `invalid_type_error` en **todos** los campos
- `.trim()` en **todos** los strings
- `.max()` con límite en **todos** los strings
- Mensajes en español
- Exportar tipo inferido: `export type FooValues = z.infer<typeof fooSchema>`
- **NUNCA** crear `index.ts` de re-exportación — importaciones directas siempre

## UI

- **Solo shadcn/ui** — no crear componentes base propios
- **Solo Lucide React** — no SVGs inline, no otras librerías de iconos
- Formularios: shadcn Form + React Hook Form + Zod (`zodResolver`)
- Tailwind CSS, mobile-first, `cn()` de `@/lib/utils` para condicionales

## Seguridad Payload

```typescript
// ❌ Access control bypassed
await payload.find({ collection: 'posts', user: someUser })

// ✅ Aplica permisos
await payload.find({ collection: 'posts', user: someUser, overrideAccess: false })

// ✅ Administrativo intencional (en services)
await payload.find({ collection: 'posts', overrideAccess: true })
```

En hooks, SIEMPRE pasar `req` a operaciones anidadas para mantener atomicidad de transacciones.

## Metodología

- Antes de crear/modificar colecciones Payload: proponer estructura y esperar confirmación
- Consultar `docs/PLAN.md` para el roadmap
- Después de modificar colecciones: `pnpm generate:types`

## Versiones — CRÍTICO

Todos los paquetes `@payloadcms/*` deben estar pinneados a la misma versión exacta (actualmente 3.75.0) — **SIN** prefijo `^`.

## Skills Instalados (`.claude/skills/`)

- `next-best-practices` — Next.js 15 App Router patterns (Vercel Labs)
