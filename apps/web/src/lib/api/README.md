# Type-Safe API Layer

A zero-boilerplate, end-to-end type-safe API pattern for Next.js using Zod schemas as the single source of truth.

## Why This Pattern

**Single source of truth**: Define request/response types once in `schemas.ts`. TypeScript infers all types automatically—no manual type definitions needed.

**Runtime safety**: Zod validates incoming requests server-side and outgoing responses client-side. Invalid data never reaches your business logic.

**Zero duplication**: No maintaining separate TypeScript types, validation logic, and API documentation. The schema is all three.

**Immediate feedback**: Mismatched client calls fail at compile time, not runtime. Refactor endpoints with confidence.

## Structure

- `schemas.ts` - Single source of truth for all API endpoint contracts
- `api-client.ts` - Client-side typed fetch wrapper with validation
- `server.ts` - Server-side request validation and response helpers
- `handleBody.ts` - Alternative flexible body handler with overloads

## How It Works

1. **Define your contract** in `schemas.ts` using Zod
2. **Server validates** incoming requests with `handleBody()`
3. **Server enforces** response shape with `alrighty()`
4. **Client validates** response against schema automatically
5. **TypeScript infers** everything—no manual type exports needed

The type system prevents you from sending wrong data, and Zod prevents you from receiving wrong data.

## Usage

### Client

```ts
import { get, post } from '@/lib/api/api-client'

// Fully typed request body and response
const data = await post('users', {
  name: 'John',
  email: 'john@example.com',
})

// TypeScript knows the exact shape of data
console.log(data.id)

// For dynamic routes, use pathOverride
const user = await get('users/[id]', undefined, '/api/users/123')
```

### Server

```ts
import { handleBody, isHandleBodyError, alrighty } from '@/lib/api/server'

export async function POST(req: NextRequest) {
  const body = await handleBody('users', req)
  if (isHandleBodyError(body)) return body

  // body is fully typed as your schema's request type
  const user = await createUser(body)

  // alrighty() validates the response before sending
  return alrighty('users', {
    success: true,
    data: { id: user.id }
  })
}
```

### Define Schemas

```ts
// schemas.ts
export const apiSchemas = {
  users: {
    req: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    res: z.object({
      success: z.boolean(),
      data: z.object({ id: z.string() }),
    }),
  },
} as const

// Types are automatically inferred
export type Endpoint = keyof typeof apiSchemas
export type Req<E extends Endpoint> = z.infer<typeof apiSchemas[E]['req']>
export type Res<E extends Endpoint> = z.infer<typeof apiSchemas[E]['res']>
```

## Benefits

- **No type drift**: Client and server stay in sync automatically
- **Better DX**: Autocomplete for endpoints, request bodies, and responses
- **Safer refactoring**: Rename a field once; TypeScript finds all usages
- **Clear errors**: Zod gives detailed validation errors, not cryptic 500s
- **Less code**: No separate validators, types, or API client boilerplate

---

## API Migration Guide

### Migration Status

**Completed: 43/~50 migratable routes (86%)** ✅

All standard API routes have been migrated to the type-safe pattern. Remaining routes require special handling (streaming, webhooks, complex business logic).

### Core Principles

**GOAL: MINIMIZE CODE, MAXIMIZE REUSABILITY AND TYPING**

1. **Reuse contracts** - Don't duplicate schemas from `packages/shared/src/contracts/`
2. **Extend contracts** - Use `.pick()`, `.extend()`, `.omit()` to compose
3. **Standardize responses** - Use consistent success/error envelopes
4. **Type everything** - Zero `any` types, full inference

### Available Contracts to Reuse

Most of the time, the API is just an extension of existing contracts in `packages/shared/src/contracts/`. The API layer is HTTP exposure of these contracts, not a new data model.

**Available contracts:**
- `agent.ts` - Agent/node configuration
- `config.ts` - Core configuration
- `evolution.ts` - Evolution settings & operations
- `ingestion.ts` - Data ingestion schemas
- `invoke.ts` - Model invocation parameters
- `messages.ts` - Message passing format
- `models.ts` - Model definitions
- `providers.ts` - Provider configurations
- `tools.ts` - Tool definitions
- `workflow.ts` - Workflow DAG structure

**If a contract doesn't exist:**
1. First consider if it belongs in `packages/shared/src/contracts/` (core domain logic)
2. If it's purely API-level (HTTP-specific), create it in `apps/web/src/lib/api/schemas.ts`

### Contract Extension Patterns

**Direct Reuse:**
```ts
import { InvokeWorkflowContract } from '@lucky/shared/contracts/invoke'

export const apiSchemas = {
  'workflow/invoke': {
    req: InvokeWorkflowContract.request,
    res: InvokeWorkflowContract.response,
  },
}
```

**Pick Specific Fields:**
```ts
import { WorkflowContract } from '@lucky/shared/contracts/workflow'

const WorkflowSummary = WorkflowContract.pick({
  id: true,
  name: true,
  createdAt: true,
})
```

**Extend with Additional Fields:**
```ts
const InvokeWithMetadata = InvokeWorkflowContract.request.extend({
  userId: z.string(),
  requestId: z.string().uuid(),
})
```

**Combine Multiple Patterns:**
```ts
const WorkflowUpdateRequest = WorkflowContract
  .omit({ id: true, createdAt: true })
  .partial()
  .extend({
    reason: z.string().optional(),
  })
```

### Migration Steps (Per Route)

**Step 1: Find Existing Contract**
- Check `packages/shared/src/contracts/` for matching domain contract
- Example: `/api/workflow/invoke` → use `invoke.ts`

**Step 2: Define Schema (Reuse + Extend)**
```ts
// In apps/web/src/lib/api/schemas.ts
import { InvokeWorkflowContract } from '@lucky/shared/contracts/invoke'

export const apiSchemas = {
  'workflow/invoke': {
    req: InvokeWorkflowContract.request,
    res: ApiResponse(InvokeWorkflowContract.response),
  },
} as const
```

**Step 3: Update Route Handler**
```ts
// Before:
const body = await req.json()
const { workflowVersionId, prompt } = body as { workflowVersionId: string, prompt: string }

// After:
const body = await handleBody('workflow/invoke', req)
if (isHandleBodyError(body)) return body
```

**Step 4: Return Typed Response**
```ts
// Before:
return NextResponse.json({ success: true, data: result }, { status: 200 })

// After:
return alrighty('workflow/invoke', { success: true, data: result })
```

**Step 5: Error Handling**
```ts
// Before:
return NextResponse.json({ error: "Something failed" }, { status: 500 })

// After:
return fail('workflow/invoke', "Something failed", { code: 'INVOKE_ERROR', status: 500 })
```

**Step 6: Verify**
1. Run `bun run tsc` - no type errors
2. Run `bun run test:smoke` - all tests pass
3. Test endpoint manually in UI
4. Remove all `as` type casts - they should be unnecessary now

### Routes NOT to Migrate

**These routes require special handling and should NOT be migrated:**

**Streaming Endpoints (ReadableStream):**
- `/api/agent/chat` - AI chat streaming
- `/api/ai/artifact` - AI artifact generation streaming
- `/api/ai/simple` - Simple AI streaming

These return `ReadableStream` for Server-Sent Events and cannot use `alrighty()`.

**JSON-RPC 2.0 Endpoints:**
- `/api/v1/invoke` - MCP JSON-RPC 2.0 compliant endpoint

Uses custom response format for MCP protocol compatibility.

**Webhook Endpoints:**
- `/api/clerk/webhooks` - Clerk webhook handler

Uses webhook signature verification, not standard auth.

**Cron/Background Jobs:**
- `/api/cron/cleanup` - Cron cleanup job
- `/api/evolution-runs/cleanup` - Evolution runs cleanup

System-level endpoints with cron secret auth.

**Complex Business Logic:**
Routes with complex multi-step logic, Redis state management, or file uploads may not benefit from migration and should be assessed case-by-case.

### Migration Checklist

For each route, ensure:
- [ ] Contract reused from `packages/shared/src/contracts/` (not duplicated)
- [ ] Schema defined in `schemas.ts` with proper typing
- [ ] Request uses `handleBody(endpoint, req)`
- [ ] Response uses `alrighty(endpoint, data)`
- [ ] Errors use `fail(endpoint, message)`
- [ ] No manual `as` type casting
- [ ] No manual JSON parsing
- [ ] Consistent response envelope (`{ success, data?, error? }`)
- [ ] Types flow end-to-end (client → server → domain)
- [ ] Tests pass (`bun run tsc && bun run test:smoke`)
