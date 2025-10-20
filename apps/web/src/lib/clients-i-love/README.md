# Lucky Client

A lightweight RLS-aware wrapper around `@together/adapter-supabase` for web API routes and server actions.

## Why use this?

- **RLS-Aware**: Uses Clerk authentication via `createRLSClient()` for Row-Level Security
- **Simple**: Just returns `SupabaseWorkflowPersistence` - no wrapper overhead
- **Type-Safe**: Full TypeScript support using existing adapter types
- **Consistent**: Same interface as the core adapter package

## Usage

```typescript
import { createLuckyClient } from "@/lib/clients-i-love/luckyClient"

export async function POST(request: Request) {
  const lucky = await createLuckyClient()

  // All SupabaseWorkflowPersistence methods available directly
  await lucky.ensureWorkflowExists(workflowId, description)

  await lucky.createWorkflowVersion({
    workflowVersionId: versionId,
    workflowId,
    dsl: workflowConfig,
    commitMessage: "Initial version",
  })

  const config = await lucky.loadWorkflowConfig(versionId)

  await lucky.createWorkflowInvocation({
    workflowInvocationId: invocationId,
    workflowVersionId: versionId,
  })

  return Response.json({ success: true })
}
```

## Available Methods

All methods from `SupabaseWorkflowPersistence`:

### Workflow Operations
- `ensureWorkflowExists(workflowId, description)` - Upsert workflow

### Workflow Version Operations
- `createWorkflowVersion(data)` - Create new version
- `workflowVersionExists(versionId)` - Check if version exists
- `ensureWorkflowVersion(...)` - Ensure version exists
- `updateWorkflowVersionWithIO(versionId, io)` - Update version with I/O
- `getWorkflowVersion(versionId)` - Get version ID
- `loadWorkflowConfig(versionId)` - Load DSL config
- `loadWorkflowConfigForDisplay(versionId)` - Load config (legacy models allowed)
- `loadLatestWorkflowConfig(workflowId?)` - Load latest config
- `updateWorkflowMemory(versionId, config)` - Update workflow memory

### Workflow Invocation Operations
- `createWorkflowInvocation(data)` - Create invocation
- `updateWorkflowInvocation(data)` - Update invocation

### Other Operations
- `loadDatasetRecords(recordIds)` - Load dataset records
- `cleanupStaleRecords()` - Cleanup stale invocations/nodes

## Replacing Direct Database Queries

### Before
```typescript
const supa = await createRLSClient()
const { data, error } = await supa.from("Workflow").insert({
  wf_id: workflowId,
  description,
})
if (error) throw error
```

### After
```typescript
const lucky = await createLuckyClient()
await lucky.ensureWorkflowExists(workflowId, description)
```

## Implementation

```typescript
export async function createLuckyClient(): Promise<SupabaseWorkflowPersistence> {
  const client = await createRLSClient()
  return new SupabaseWorkflowPersistence(client)
}
```

That's it! Just a thin wrapper that:
1. Creates an RLS-aware Supabase client
2. Returns a `SupabaseWorkflowPersistence` instance
3. No extra indirection - call methods directly on the returned object
