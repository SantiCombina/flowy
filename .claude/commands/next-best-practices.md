---
name: next-best-practices
description: Next.js best practices - file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers, image/font optimization, bundling
---

# Next.js Best Practices

Apply these rules when writing or reviewing Next.js code.

Read the detailed rule files from `.agents/skills/next-best-practices/` as needed:

- `file-conventions.md` — project structure, route segments, parallel/intercepting routes
- `rsc-boundaries.md` — invalid RSC patterns, non-serializable props, Server Action exceptions
- `async-patterns.md` — async `params`, `searchParams`, `cookies()`, `headers()`, migration codemod
- `runtime-selection.md` — Node.js vs Edge runtime
- `directives.md` — `'use client'`, `'use server'`, `'use cache'`
- `functions.md` — navigation hooks, server functions, generate functions
- `error-handling.md` — `error.tsx`, `not-found.tsx`, `redirect`, `notFound`, `unstable_rethrow`
- `data-patterns.md` — Server Components vs Server Actions vs Route Handlers, avoiding waterfalls
- `route-handlers.md` — `route.ts` basics, GET conflicts, when to use vs Server Actions
- `metadata.md` — static/dynamic metadata, `generateMetadata`, OG images
- `image.md` — `next/image`, remote config, `sizes`, blur placeholders, LCP priority
- `font.md` — `next/font`, Google Fonts, local fonts, Tailwind integration
- `bundling.md` — server-incompatible packages, CSS imports, ESM/CJS issues, bundle analysis
- `scripts.md` — `next/script`, loading strategies, Google Analytics
- `hydration-error.md` — common causes, debugging, fixes
- `suspense-boundaries.md` — CSR bailout, hooks requiring Suspense
- `parallel-routes.md` — modal patterns, `default.tsx`, `router.back()`
- `self-hosting.md` — `output: 'standalone'`, cache handlers for ISR
- `debug-tricks.md` — MCP endpoint, `--debug-build-paths`