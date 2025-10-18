# Supabase Adapter Refactoring Summary

## Overview

Refactored the `@together/adapter-supabase` package following clean architecture principles with proper separation of concerns, dependency injection, and domain-driven design patterns.

## Key Improvements

### 1. **Factory Pattern with DI**

**Before:**
```typescript
import { SupabasePersistence } from '@together/adapter-supabase'
const persistence = new SupabasePersistence()
```

**After:**
```typescript
import { createPersistence } from '@together/adapter-supabase'
const persistence = createPersistence({ backend: 'supabase' })
```

Benefits:
- Explicit dependency injection
- Environment-based configuration (`USE_MOCK_PERSISTENCE`)
- Easy to swap implementations for testing

### 2. **Domain Module Organization**

**Before:** Flat structure with mixed concerns
```
src/
├── supabase-persistence.ts (500+ lines, all logic)
├── node-persistence.ts
├── message-persistence.ts
└── field-mapper.ts
```

**After:** Organized by domain
```
src/
├── workflows/          # Workflow version and invocation logic
├── nodes/             # Node persistence
├── messages/          # Message persistence
├── evolution/         # Evolution tracking
├── utils/             # Field mapping utilities
├── errors/            # Domain error types
├── factory.ts         # Factory function
├── persistence-interface.ts
├── supabase-persistence.ts   # Thin orchestrator
└── memory-persistence.ts
```

Benefits:
- Single responsibility per module
- Clear domain boundaries
- Easier to navigate and maintain

### 3. **Domain Error Types**

**Before:**
```typescript
throw new Error(`Failed to save node version: ${error.message}`)
```

**After:**
```typescript
throw new PersistenceError(`Failed to save node version: ${error.message}`, error)
throw new NodeVersionMissingError(nodeId, workflowVersionId, error)
throw new WorkflowNotFoundError(workflowVersionId)
```

Error hierarchy:
- `PersistenceError` - Base error with cause chaining
- `WorkflowNotFoundError` - Specific workflow errors
- `NodeVersionMissingError` - Node-specific errors
- `DatasetRecordNotFoundError` - Dataset errors
- `InvalidInputError` - Input validation errors

Benefits:
- Type-safe error handling
- Better error context with cause chaining
- Domain-specific error messages

### 4. **Field Mapping Improvements**

**Before:**
```typescript
export function applyFieldMappings(obj: any): any {
  // ... maps everything including undefined
}
```

**After:**
```typescript
export function applyFieldMappings<T = any>(obj: any): T {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue  // Skip undefined values
    // ...
  }
}
```

Benefits:
- Skips undefined values (prevents DB errors)
- Type-safe with generics
- Consistent handling of nested objects and arrays

### 5. **Supabase Query Improvements**

**Before:**
```typescript
const { data, error } = await client.from("table").select().single()
if (error?.code === "PGRST116") return null  // Brittle error code check
```

**After:**
```typescript
const { data, error } = await client.from("table").select().maybeSingle()
if (error) throw new PersistenceError("...", error)
return data ?? null
```

Benefits:
- Uses `maybeSingle()` instead of `single()` for optional records
- Explicit null handling instead of error code checks
- Better error propagation

### 6. **Clean Insertable Objects**

**Before:**
```typescript
const insertable = { ...mapped }
insertable.message_id = undefined  // Sets undefined in DB payload
insertable.agent_steps = undefined
```

**After:**
```typescript
const insertable: any = { ...mapped }
delete insertable.message_id  // Removes key entirely
delete insertable.agent_steps
```

Benefits:
- Cleaner DB payloads (no undefined values)
- Supabase-js handles absence vs. undefined differently
- Prevents unexpected DB behavior

### 7. **Comprehensive Documentation**

Added:
- `README.md` - Usage examples, API docs, schema reference
- `REFACTORING.md` - This document
- Inline JSDoc comments for all public APIs

Benefits:
- Self-documenting codebase
- Clear migration path
- Schema documentation in one place

## Migration Guide

### For New Code

Use the factory pattern:
```typescript
import { createPersistence } from '@together/adapter-supabase'

const persistence = createPersistence({ backend: 'supabase' })
// or for tests:
const persistence = createPersistence({ backend: 'memory' })
```

### For Existing Code

No changes needed! Direct imports still work:
```typescript
import { SupabasePersistence } from '@together/adapter-supabase'
const persistence = new SupabasePersistence()
```

But consider migrating to the factory for better testability.

### Error Handling

Catch specific errors:
```typescript
import { WorkflowNotFoundError, PersistenceError } from '@together/adapter-supabase'

try {
  await persistence.loadWorkflowConfig(id)
} catch (error) {
  if (error instanceof WorkflowNotFoundError) {
    // Handle missing workflow
  } else if (error instanceof PersistenceError) {
    console.error(error.cause)  // Access original error
  }
}
```

## Testing Improvements

### Before
```typescript
// Had to mock Supabase client
vi.mock('@supabase/supabase-js')
```

### After
```typescript
// Just use in-memory implementation
const persistence = createPersistence({ backend: 'memory' })
```

Benefits:
- No mocking required
- Faster tests
- Same interface guarantees

## Architecture Principles Applied

1. **Dependency Inversion** - Core depends on `IPersistence` interface, not on Supabase
2. **Single Responsibility** - Each module has one clear purpose
3. **Open/Closed** - Easy to add new persistence backends without changing existing code
4. **Interface Segregation** - Specialized interfaces (`INodePersistence`, `IEvolutionPersistence`)
5. **DRY** - Field mapping logic centralized in utils

## Performance Considerations

- Lazy initialization of Supabase client (only when needed)
- Lazy initialization of sub-persistence modules
- Efficient field mapping with early returns
- Bulk operations for cleanup

## Breaking Changes

**None!** All existing imports continue to work. The refactoring is backward compatible.

## Next Steps

1. Migrate existing core code to use factory pattern
2. Add retry logic for transient Supabase errors
3. Add transaction support for atomic operations
4. Implement bulk insert/update operations
5. Add conformance test suite (same tests for Supabase and in-memory)
