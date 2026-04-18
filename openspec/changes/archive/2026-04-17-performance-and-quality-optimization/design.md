# Design: Performance and Quality Optimization

## Technical Approach

Refactor in 3 sprints without functional changes: (1) move filtering/pagination server-side and tighten DB queries, (2) add Suspense/streaming and eliminate client-side settings flash, (3) clean code-quality violations. No Payload collections modified; no `pnpm generate:types` required.

## Architecture Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Server-side filtering | Pass `filters` + `page` params to existing `getVariantsAction` | Add new action | Action already accepts `filters` + `options`; no new surface needed |
| Eliminate variantsCache | Remove module-level mutable globals; rely on React state + server freshness | Keep cache, add TTL | Module globals are shared across concurrent requests (RSC model) — unsafe; TTL logic already broken |
| inventoryValue calc | Compute in action response (sum server-side) | Keep client `useMemo` | With server-side pagination, client has only current page — local reduce gives wrong total |
| Dashboard select | Add `select: { stock: true, costPrice: true, minimumStock: true }` to variants query; reduce `depth` from 2 to 0 | Full object retrieval | Variants query in dashboard only uses those 3 fields; depth 2 loads relations never consumed |
| Products first-query select | Add `select: { id: true }` to products pre-filter query in `getVariantsWithProducts` | Full retrieval | Only IDs used to build `where.product = { in: [...] }` |
| unstable_cache tags | Tags `['dashboard', String(ownerId), period]` per owner+period | Single 'owner-dashboard' tag | Current single tag invalidates all owners/periods on any mutation; granular tags allow targeted revalidation |
| Settings via props | Load settings in `MainLayout` (already has `getCurrentUser()`), pass as `initialSettings` prop to `SettingsProvider` | Keep useEffect fetch | Layout is already async SC; eliminates one round-trip and the client-side loading flash |
| SalesRefreshContext | Replace `refreshCount++` counter with `router.refresh()` from `next/navigation` | Keep counter | `router.refresh()` re-fetches RSC tree; counter just re-triggers client fetches via useEffect dependencies — less aligned with App Router model |
| Barrel file removal | Delete `src/components/products/product-modal-new/schemas.ts`; update the one consumer (`products-section.tsx`) | Keep barrel | Violates project convention; barrel files are explicitly banned |

## Data Flow

### A — Server-side filtering (Sprint 1)

```
ProductsSection (state: filters, page)
  └─→ getVariantsAction({ filters, options: { limit: 50, page } })
        └─→ getVariantsWithProducts(ownerId, filters, { limit: 50, page })
              ├─→ products pre-query  [select: { id: true }]   (only if filters present)
              └─→ product-variants query [depth: 2, paginated]
  ←── { docs, totalDocs, totalPages, page, inventoryValue }
```

Client no longer holds `allVariants`; holds `currentPage`, `totalPages`, `filters` only.

### D — Settings from Server Component (Sprint 2)

```
MainLayout (SC, has getCurrentUser())
  └─→ getSettings(user.id)  [new service call]
        └─→ payload.find({ collection: 'user-settings', ... })
  ←── initialSettings
  └─→ <SettingsProvider initialSettings={initialSettings}>
        (no useEffect, no action call on mount)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/products/products-table.tsx` | Modify | Remove `variantsCache`, `demandCache`, `STALE_TIME`; accept `variants`, `totalDocs`, `totalPages`, `currentPage`, `onPageChange` as props; remove local filter logic |
| `src/components/products/products-section.tsx` | Modify | Own filter state + pagination; call `getVariantsAction` on filter/page change; compute `inventoryValue` from action response |
| `src/app/services/products.ts` | Modify | `getVariantsWithProducts`: add `select: { id: true }` to products pre-query; remove inline comments |
| `src/app/services/dashboard.ts` | Modify | Add `select` to variants query; reduce depth to 0; update `unstable_cache` tags to `['dashboard', String(ownerId), period]` |
| `src/app/services/sales.ts` | Modify | Replace 20+ `as { id: number }` casts with `resolveId()` from `@/lib/payload-utils` |
| `src/app/services/stock-movements.ts` | Modify | Remove inline comments |
| `src/app/services/check-user.ts` | Modify | Wrap `console.error` with `if (process.env.NODE_ENV !== 'production')` guard |
| `src/app/services/users.ts` | Modify | Same `console.error` guard |
| `src/lib/notify.ts` | Modify | Same `console.error` guard |
| `src/contexts/settings-context.tsx` | Modify | Accept `initialSettings` prop; remove `useEffect` fetch on mount; keep `reloadSettings` for manual refresh |
| `src/app/(frontend)/(main)/layout.tsx` | Modify | Load settings server-side; pass as `initialSettings` to `SettingsProvider` |
| `src/contexts/sales-refresh-context.tsx` | Modify | Replace `refreshCount` state with `router.refresh()` call; simplify context to `{ triggerRefresh }` |
| `src/app/(frontend)/(main)/clients/loading.tsx` | Create | Skeleton matching clients table layout |
| `src/app/(frontend)/(main)/assignments/loading.tsx` | Create | Skeleton matching assignments table layout |
| `src/app/(frontend)/(main)/history/loading.tsx` | Create | Skeleton matching history table layout |
| `src/app/(frontend)/(main)/profile/loading.tsx` | Create | Skeleton matching profile form layout |
| `src/app/(frontend)/(main)/products/page.tsx` | Modify | Wrap parallel data fetches in async component with `<Suspense>` |
| `src/components/products/product-modal-new/schemas.ts` | Delete | Barrel file; violates project convention |
| `src/schemas/products/product-schema.ts` | Modify | Add `.trim().max(500)` to `description`; `.trim().max(100)` to optional string ID fields |

## Interfaces / Contracts

```typescript
// settings-context.tsx — new prop
interface SettingsProviderProps {
  children: ReactNode;
  initialSettings: SettingsData | null;
}

// products-table.tsx — controlled table (props replace internal state)
interface ProductsTableProps {
  variants: PopulatedProductVariant[];
  totalDocs: number;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  inventoryValue: number;
  // ... existing: onEdit, showActions, showInventoryValue, selectable, etc.
}

// sales-refresh-context.tsx — simplified
interface SalesRefreshContextValue {
  triggerRefresh: () => void;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type check | All modified files | `tsc --noEmit` after each sprint |
| Lint | No new warnings | `pnpm lint` after each sprint |
| Manual | Settings load without flash | Navigate to any route and verify no loading state flicker |
| Manual | Pagination correct | Verify page 2 shows different records than page 1 |
| Manual | Filters server-side | Apply brand filter; verify network payload is reduced |

## Migration / Rollout

No migration required. No schema changes. Each sprint can be reverted independently via `git revert`. Deploy order: Sprint 1 → Sprint 2 → Sprint 3.

## Open Questions

- [ ] `SalesRefreshContext` consumers use `refreshCount` in `useEffect` deps — verify all call sites before removing the counter to avoid missed refreshes
- [ ] `getSettings` service function may not exist yet; verify or create in `src/app/services/settings.ts` before Sprint 2
