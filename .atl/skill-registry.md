# Skill Registry — flowy

Generated: 2026-04-17

## Convention Files
- `CLAUDE.md` (project-level) — architecture, conventions, 3-layer pattern, Payload CMS rules
- `~/.claude/CLAUDE.md` (global) — stack defaults, TypeScript rules, shadcn/ui, forms, server actions

## User Skills (from ~/.claude/skills/)

| Skill | Trigger |
|-------|---------|
| `branch-pr` | Creating a PR, opening a pull request, preparing changes for review |
| `frontend-design` | Building web components, pages, dashboards, or styling/beautifying UI |
| `go-testing` | Writing Go tests, using teatest, or adding test coverage |
| `issue-creation` | Creating a GitHub issue, reporting a bug, requesting a feature |
| `judgment-day` | "judgment day", "judgment-day", "review adversarial", "dual review", "juzgar", "que lo juzguen" |
| `next-best-practices` | Next.js 15 App Router patterns — loaded automatically for frontend tasks |
| `payload` | Working with Payload collections, hooks, access control, debugging Payload |
| `seo-audit` | SEO audit, technical SEO, why am I not ranking, SEO issues |
| `skill-creator` | Create a new skill, add agent instructions, document patterns for AI |
| `web-design-guidelines` | Reviewing UI for accessibility, design compliance, UX audit |

## SDD Phase Skills

| Skill | Phase |
|-------|-------|
| `sdd-explore` | Investigation and codebase research |
| `sdd-propose` | Change proposal creation |
| `sdd-spec` | Requirements and scenarios spec writing |
| `sdd-design` | Technical design and architecture |
| `sdd-tasks` | Task breakdown |
| `sdd-apply` | Implementation |
| `sdd-verify` | Validation against specs |
| `sdd-archive` | Archiving completed change |
| `sdd-onboard` | Guided walkthrough of the full SDD cycle |

## Compact Rules (injected into sub-agents)

### TypeScript & Code Conventions
- Strict TypeScript — never `any`, avoid `as` (only for Payload response casts)
- No barrel files (`index.ts` re-exports)
- No comments in code
- kebab-case file names
- English for all identifiers

### Architecture (3-layer mandatory)
- Client Component → `useAction(action)` → never call actions directly
- Action (`src/components/[feature]/actions.ts`): `actionClient` + `getCurrentUser()` + role check + schema from `@/schemas/`
- Service (`src/app/services/[entity].ts`): Payload DB only, `overrideAccess: true`, receives `ownerId`
- Schema (`src/schemas/[feature]/[name]-schema.ts`): Zod, `required_error` + `invalid_type_error` on all fields, `.trim()` + `.max()` on strings, messages in Spanish

### Rendering
- Server Components by default; `"use client"` only for state/events/browser APIs
- Componentize: separate server vs client logic in different files

### UI
- shadcn/ui only — install via `npx shadcn@latest add <component>`
- Lucide React for icons — no SVGs inline
- `cn()` from `@/lib/utils` for conditional classes
- Tailwind CSS 4.x, mobile-first

### Forms
- Full shadcn Form stack: `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>`
- `useForm` + `zodResolver` + submit via `executeAsync`

### Payload CMS
- Types from `src/payload-types.ts` — auto-generated, never edit
- Run `pnpm generate:types` after any collection change
- All `@payloadcms/*` pinned to `3.75.0` (no `^`)
- In hooks, always pass `req` to nested operations for transaction atomicity
- `overrideAccess: false` when applying real access control; `true` in services

### Quality Gates
- `tsc --noEmit` — must pass before shipping
- `pnpm lint` — ESLint + next lint
- No `console.log` in production code
