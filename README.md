# Stocker

Sistema de gestión de inventario y ventas para distribuidoras, diseñado para reemplazar hojas de Excel por una plataforma moderna donde los owners puedan gestionar su inventario, vendedores y ventas en tiempo real.

## Tech Stack

- Next.js 15 (App Router)
- Payload CMS 3.75.x
- PostgreSQL (Neon.tech)
- Tailwind CSS 4.x
- shadcn/ui
- TypeScript

## Setup

1. **Clone el repositorio**

```bash
git clone <repository-url>
cd stock-flow
```

2. **Instala las dependencias**

```bash
pnpm install
```

3. **Configura las variables de entorno**

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

**IMPORTANTE**: Para evitar warnings de seguridad SSL, asegúrate de que tu `DATABASE_URL` incluya `sslmode=verify-full` en producción:

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=verify-full
```

4. **Ejecuta el servidor de desarrollo**

```bash
pnpm dev
```

5. Abre `http://localhost:3000` en tu navegador

## Comandos Disponibles

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

## How it works

The Payload config is tailored specifically to the needs of most websites. It is pre-configured in the following ways:

### Collections

See the [Collections](https://payloadcms.com/docs/configuration/collections) docs for details on how to extend this functionality.

- #### Users (Authentication)

  Users are auth-enabled collections that have access to the admin panel.

  For additional help, see the official [Auth Example](https://github.com/payloadcms/payload/tree/main/examples/auth) or the [Authentication](https://payloadcms.com/docs/authentication/overview#authentication-overview) docs.

- #### Media

  This is the uploads enabled collection. It features pre-configured sizes, focal point and manual resizing to help you manage your pictures.

### Docker

Alternatively, you can use [Docker](https://www.docker.com) to spin up this template locally. To do so, follow these steps:

1. Follow [steps 1 and 2 from above](#development), the docker-compose file will automatically use the `.env` file in your project root
1. Next run `docker-compose up`
1. Follow [steps 4 and 5 from above](#development) to login and create your first admin user

That's it! The Docker instance will help you get up and running quickly while also standardizing the development environment across your teams.

## Development Guidelines

This project follows strict coding conventions to maintain code quality and consistency. **Please read [AGENTS.md](./AGENTS.md) for complete development guidelines.**

### Key Principles

- **TypeScript**: Use types from `payload-types.ts`, never use `any`, avoid `as`
- **Components**: Use `'use server'` by default, `'use client'` only when necessary
- **UI**: Always use shadcn/ui components and Lucide React icons
- **Forms**: shadcn Form + React Hook Form + Zod validation
- **Architecture**: Three-layer pattern (Services → Actions → Components)
- **Server Actions**: Always use `next-safe-action` with `executeAsync` from `useAction`
- **Code Quality**: No comments in code - code should be self-explanatory

See [AGENTS.md](./AGENTS.md) for detailed examples and patterns.

## Questions

If you have any issues or questions, reach out to us on [Discord](https://discord.com/invite/payload) or start a [GitHub discussion](https://github.com/payloadcms/payload/discussions).
