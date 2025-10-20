# PR4: Remove Legacy IPersistence Interface (Cleanup)

**Status:** Not Started
**Estimated Effort:** 2-3 hours
**Risk:** Low (only used internally now)
**Depends On:** PR3

---

## Objective

Remove the old `IPersistence` interface and all legacy implementations. Make `PersistencePort` the only public API. Clean up adapter internals.

---

## What to Delete

### 1. **Old Interface File**

Delete `packages/adapter-supabase/src/persistence-interface.ts` entirely.

This removes:
- `IPersistence` interface
- Old custom types (`GenerationData`, `NodeInvocationStartData`, etc.)
- Legacy method signatures

### 2. **Old Implementation Classes**

Delete these files:
- `packages/adapter-supabase/src/supabase-persistence.ts`
- `packages/adapter-supabase/src/evolution/evolution-persistence.ts` (if still using old types)
- `packages/adapter-supabase/src/workflows/workflow-persistence.ts` (if still using old types)
- `packages/adapter-supabase/src/nodes/node-persistence.ts` (if still using old types)
- `packages/adapter-supabase/src/messages/message-persistence.ts` (if still using old types)

Keep only if they've been refactored to support `PersistencePort`.

### 3. **Old Factory Function**

In `packages/adapter-supabase/src/factory.ts`:

**Before:**
```typescript
export function createPersistence(config: PersistenceConfig): IPersistence {
  return new SupabasePersistence(...)
}
```

**After:**
```typescript
export function createPersistence(config: PersistenceConfig): PersistencePort {
  const client = getSupabaseClient(config)
  return new SupabasePersistencePort(client)
}
```

Or delete factory entirely and have callers instantiate directly.

### 4. **Update Index Exports**

In `packages/adapter-supabase/src/index.ts`:

**Before:**
```typescript
export type {
  IPersistence,
  IEvolutionPersistence,
  GenerationData,
  RunData,
  // ... old types
} from "./persistence-interface"

export { SupabasePersistence } from "./supabase-persistence"
export { InMemoryPersistence } from "./memory-persistence"
```

**After:**
```typescript
// Only export port types and implementations
export type { PersistencePort } from "@lucky/shared/contracts"
export { SupabasePersistencePort } from "./supabase-port"
export { InMemoryPersistencePort } from "./memory-port"
export { createPersistence } from "./factory"
```

---

## What to Keep

### Files to Keep:
- `supabase-port.ts` (new implementation)
- `memory-port.ts` (new implementation)
- `mappers/` directory (translation layer)
- `client.ts` (Supabase client initialization)
- `errors/` directory (domain errors)

---

## Refactor Internal Organization

Simplify adapter structure:

```
packages/adapter-supabase/src/
├── supabase-port.ts          ← Main Supabase implementation
├── memory-port.ts            ← In-memory implementation
├── mappers/
│   ├── workflow-version.ts   ← Domain ↔ DB translation
│   ├── workflow-invocation.ts
│   ├── generation.ts
│   └── node-invocation.ts
├── errors/
│   └── domain-errors.ts      ← NotFound, AlreadyExists, etc.
├── client.ts                 ← Supabase client factory
├── factory.ts                ← createPersistence helper
└── index.ts                  ← Public exports
```

---

## Update Tests

### Delete Old Tests

Remove tests that test the old interface:
- Tests importing `IPersistence`
- Tests using old method names (`createWorkflowVersion` with `Tables<...>`)

### Keep New Tests

Tests using `PersistencePort`:
- `__tests__/port-contract.test.ts` (contract compliance)
- Tests using domain commands and models

---

## Verification After Deletion

```bash
# 1. Ensure no references to old interface
grep -r "IPersistence" packages/
# Expected: No results (except in this PR doc)

grep -r "GenerationData\|RunData\|NodeInvocationData" packages/
# Expected: No results

# 2. Ensure TypeScript compiles
cd packages/adapter-supabase
npm run tsc
# Expected: 0 errors

# 3. Ensure all tests pass
npm run test
# Expected: 100% pass

# 4. Ensure core still imports nothing from adapter internals
cd packages/core
grep -r "supabase.types\|public.types" src/
# Expected: No results
```

---

## Documentation Updates

Update these files:
- `SUPABASE_SCHEMA.md` - Remove references to old interface
- `ARCHITECTURE_QUESTION.md` - Add note: "Resolved via PR1-4"
- `README.md` - Update examples to use `PersistencePort`

---

## Verification Checklist

- [ ] Old `persistence-interface.ts` deleted
- [ ] Old implementation classes deleted or refactored
- [ ] Index exports only `PersistencePort` and new implementations
- [ ] Factory function returns `PersistencePort` or deleted
- [ ] No `IPersistence` references remain in codebase
- [ ] No old custom types (`GenerationData`, etc.) remain
- [ ] `tsc` compiles with 0 errors across all packages
- [ ] All tests pass
- [ ] ESLint passes (no forbidden imports)
- [ ] Documentation updated to reflect new architecture
- [ ] End-to-end workflow execution works
- [ ] End-to-end evolution run works

---

## Final State

After this PR:

```
@lucky/core
  ├─ Imports: PersistencePort from @lucky/shared/contracts
  ├─ Uses: Domain commands (CreateWorkflowVersionCmd, etc.)
  └─ Gets: Domain models (WorkflowVersion, WorkflowInvocation, etc.)

@together/adapter-supabase
  ├─ Implements: PersistencePort
  ├─ Imports: Supabase types (Tables, TablesInsert, TablesUpdate)
  ├─ Contains: Mappers (domain ↔ DB translation)
  └─ Exports: SupabasePersistencePort, InMemoryPersistencePort

@lucky/shared
  ├─ Exports: Domain contracts (types, ports)
  └─ Exports: Supabase types (only for adapter use)
```

**Coupling eliminated. Schema changes isolated to adapter.**

---

## Rollback Plan

If issues discovered:
1. Revert PR4
2. Adapter temporarily supports both interfaces
3. Fix issues in core
4. Re-run PR4

---

## Success Criteria

The anti-corruption boundary is complete when:
- ✅ Core has zero Supabase type imports
- ✅ Schema change affects only adapter mappers
- ✅ Both implementations pass identical tests
- ✅ tsc errors = 0
- ✅ System works end-to-end
