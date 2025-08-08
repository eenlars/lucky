# Next.js Server-Side Environment Variable Access Error Analysis

## The Error
```
Error: ❌ Attempted to access a server-side environment variable on the client
../core/src/utils/clients/supabase/client.ts (9:75) @ eval
```

## Problem Overview

This is a **client-side hydration error** where server-side environment variables are being accessed in client-side code during Next.js rendering. The error occurs when the Supabase client is initialized on the client-side but tries to access environment variables that should only be available server-side.

## File Structure Context

The error originates from:
- **Source**: `../core/src/utils/clients/supabase/client.ts` (line 9)
- **Usage Chain**: 
  1. `WorkflowLoader.ts` imports the Supabase client
  2. `WorkflowRunner.tsx` uses `WorkflowLoader`
  3. Next.js page component renders `WorkflowRunner`
  4. Client-side hydration attempts to execute the Supabase client initialization

## Code Analysis

### The Problematic Code
```typescript
// ../core/src/utils/clients/supabase/client.ts (line 9)
const supabaseUrl = `https://${envi.SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_ID}.supabase.co`
const supabaseKey = envi.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseKey!, {
  auth: {
    persistSession: false,
  },
})
```

### The Issue
The code uses a **module-level export** that executes during import. When this module is imported by client-side code, it attempts to access `process.env.SUPABASE_ANON_KEY` on the client where it's not available.

## Environment Variable Context

### Next.js Environment Variable Rules
- **Server-side**: All environment variables available via `process.env`
- **Client-side**: Only variables prefixed with `NEXT_PUBLIC_` are available
- **Hydration**: Client tries to match server-rendered content, causing conflicts

### Current Configuration Issues
1. `SUPABASE_ANON_KEY` is not prefixed with `NEXT_PUBLIC_`
2. The client initialization happens at module import time
3. No client/server environment distinction in the code

### T3-oss Environment Schema Analysis
The `envi` module uses `@t3-oss/env-nextjs` with:
```typescript
export const envi = createEnv({
  server: {
    SUPABASE_PROJECT_ID: z.string().nullish(),
    SUPABASE_ANON_KEY: z.string().nullish(),
    // ... other server-only vars
  },
  runtimeEnv: {
    SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    // ... other runtime mappings
  },
})
```

**Critical Issue**: Variables are defined in `server` section but accessed client-side. T3-env prevents client access to server-only variables.

## Import Chain Analysis

```
Next.js Page → WorkflowRunner.tsx → WorkflowLoader.ts → supabase/client.ts
                                                      ↑
                                                 MODULE EXECUTION
                                                (happens on import)
```

The import chain shows that:
1. `WorkflowRunner.tsx` is marked `"use client"`
2. It imports `loadFromDSL` from `WorkflowLoader.ts`
3. `WorkflowLoader.ts` imports `supabase` from client module
4. The client module executes at import time, accessing server variables

## Hidden Assumptions

1. **Assumption**: Environment variables work the same on client and server
   - **Reality**: Next.js has strict separation for security

2. **Assumption**: Module-level initialization is safe
   - **Reality**: Causes issues during SSR/hydration

3. **Assumption**: `envi.SUPABASE_ANON_KEY` fallback works
   - **Reality**: Both `envi` and `process.env` may be undefined client-side

4. **Assumption**: Supabase client can be a singleton
   - **Reality**: Needs different handling for client/server contexts

5. **Assumption**: T3-env server variables are accessible everywhere
   - **Reality**: T3-env enforces strict client/server separation

## Configuration Files Context

### Next.js Configuration
- The app uses Next.js 15.3.5 with Webpack bundling
- SSR/hydration enabled (default Next.js behavior)
- No apparent client-side environment variable configuration
- Missing `NEXT_PUBLIC_` prefixed variables for client access

### TypeScript Configuration
- Path aliases configured (based on import patterns: `@core/`)
- Likely using strict mode (inferred from codebase patterns)
- Cross-module imports from `core` to `app` indicate monorepo structure

### T3-oss Environment Configuration
The environment configuration defines all variables as server-only:
- No `client` section in the schema
- No `NEXT_PUBLIC_` prefixed variables
- All variables mapped through `runtimeEnv` with `process.env` access

## Runtime Context

### When the Error Occurs
1. **Server-side rendering**: Works fine, environment variables available
2. **Client-side hydration**: Fails when trying to match server content
3. **Browser execution**: Environment variables not available, T3-env blocks access

### The Execution Flow
1. Next.js renders page server-side ✅
2. Sends HTML to browser ✅
3. Browser loads JavaScript bundles ✅
4. Hydration process starts ✅
5. Module imports execute → Supabase client initialization ❌
6. `envi.SUPABASE_ANON_KEY` access blocked by T3-env ❌
7. Fallback to `process.env.SUPABASE_ANON_KEY` fails ❌

## Architecture Implications

### Current Architecture Problem
- **Tight coupling**: Database client directly imported by UI components
- **No abstraction**: No server/client boundary handling
- **Eager initialization**: Client created at import time instead of lazy initialization
- **Wrong environment scope**: Server variables accessed in client context

### Workflow System Impact
This error affects the workflow runner system's ability to:
- Load workflow data from Supabase
- Display workflow visualization
- Execute workflow operations in the browser

### Cross-Module Dependencies
The error reveals architectural issues:
- **Core → App dependency**: `core` module client imported by `app` module
- **Server → Client leakage**: Server-side utilities used in client components
- **Environment boundary violations**: No clear client/server separation

## Security Context

### Why This Restriction Exists
- **Security**: Prevents server secrets from leaking to client
- **Bundle size**: Avoids including server-only code in client bundles
- **Performance**: Reduces client-side JavaScript payload

### Supabase Anon Key Exception
- Supabase anon keys are **designed** to be client-accessible
- Should be prefixed with `NEXT_PUBLIC_` for Next.js client access
- Row Level Security (RLS) handles actual authorization
- T3-env should define it in `client` section for browser access

## Database Usage Patterns

### Current Usage
From `WorkflowLoader.ts`:
```typescript
// Line 308: Database query in server-like context
const { data, error } = await supabase
  .from("WorkflowVersion")
  .select("dsl")
  .eq("wf_version_id", workflowVersionId)
  .single()
```

### Client-Side Usage
From `WorkflowRunner.tsx`:
```typescript
// Line 150: Client component trying to use server-side loader
const validatedConfig = await loadFromDSL(workflowVersion.dsl as any)
```

This shows the architectural mismatch: client components using server-side database utilities.

## Solution Requirements

The fix needs to address:
1. **Environment variable access**: Make `SUPABASE_ANON_KEY` client-accessible
2. **Module initialization**: Prevent eager client creation
3. **SSR compatibility**: Ensure consistent client/server behavior
4. **Architecture**: Maintain clean separation between client/server code
5. **T3-env compliance**: Follow T3-env patterns for client/server variables

## Related Files to Investigate

Based on the call stack and imports:
- `WorkflowLoader.ts:300-330` - Database query methods
- `WorkflowRunner.tsx:150` - Client-side DSL loading
- `core/src/utils/env.mjs` - T3-env configuration
- `app/src/env.mjs` - Possible app-specific environment config
- `.env.local` or `.env` - Environment variable definitions
- `next.config.ts` - Next.js configuration
- API routes in `/api/workflow/` - Server-side alternatives

## Specific Code Locations

### Error Source
- **File**: `core/src/utils/clients/supabase/client.ts:9`
- **Issue**: Module-level client creation with server variables

### Environment Configuration
- **File**: `core/src/utils/env.mjs:8-9`
- **Issue**: Server-only variable definition

### Client Component Usage  
- **File**: `app/src/app/(runner)/runner/[wf_version_id]/components/WorkflowRunner.tsx:150`
- **Issue**: Client component using server-side utilities

### Import Chain Root
- **File**: `core/src/workflow/setup/WorkflowLoader.ts:2`
- **Issue**: Server-side module importing client singleton

This analysis reveals a fundamental architectural mismatch between client/server boundaries and environment variable scope in the Next.js application.