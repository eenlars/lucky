# The Fundamental Question for @together/adapter-supabase

> If you could solve one architectural problem in this adapter, and doing so would prevent any future issues, what would it be?

This document frames that singular question. Written as a gentle inquiry to someone who sees the entire system.

---

## Context: What This Codebase Is

**The Codebase:** An autonomous workflow evolution system. AI agents exist as graphs of interconnected nodes. These nodes execute, communicate via messages, improve themselves through genetic programming and iterative learning, and persist everything to a database.

**The Adapter's Role:** Persistence layer. It sits between the autonomous workflow core (`@lucky/core`) and Supabase database. All data flows through it—invocations, versions, evolution runs, generations, messages, everything.

**Why It Matters:** This adapter is invisible infrastructure. When it works, nobody notices. When it breaks, the entire system stops. Currently, we're seeing cascading type errors that suggest the adapter is trying to be two things at once, and doing neither well.

---

## What's Actually Happening Right Now

### The Immediate Problem (What We Saw)

90 TypeScript errors in `@lucky/core` that stem from the adapter. When we started fixing `supabase-persistence.ts`, we got down to 33 errors—but the remaining ones revealed something deeper.

The interface says: `createWorkflowInvocation(data: Tables<"WorkflowInvocation">): Promise<void>`

This is wrong. `Tables<T>` is what you get back from a SELECT query. It's a complete database row. You don't CREATE with complete rows; you CREATE with new data to insert. The interface is semantically confused.

### The Architectural Problem (What This Reveals)

The adapter is **directly exposing Supabase-generated types** to the entire application:

```typescript
// This is what happens today
interface IPersistence {
  createWorkflowVersion(data: TablesInsert<"WorkflowVersion">): Promise<void>
  createWorkflowInvocation(data: Tables<"WorkflowInvocation">): Promise<void>
  updateWorkflowInvocation(data: TablesUpdate<"WorkflowInvocation">): Promise<void>
}

// @lucky/core then does this
persistence.createWorkflowVersion({
  wf_version_id: "...",
  workflow_id: "...",
  dsl: {...},
  // ...all database field names and structure
})
```

This creates a **critical dependency coupling:**

1. The workflow engine knows about database field names (`wf_version_id`, `workflow_id`, not `versionId`, `id`)
2. Core logic depends on Supabase's schema decisions
3. When the schema changes, 50 files break instead of 1
4. The adapter provides no translation—it just passes data through

### Why This Is Wrong

In well-architected systems, there's a dependency wall:

```
┌─────────────────────────────────────┐
│  Core Domain (@lucky/core)          │  ← Knows about business logic
│  (Workflows, Evolution, Agents)     │    Doesn't know about databases
└─────────────────────────────────────┘
            ↓ depends on
┌─────────────────────────────────────┐
│  Adapter (@together/adapter-supabase)│ ← Knows about both
│  (Persistence Interface)            │   Translates between them
└─────────────────────────────────────┘
            ↓ depends on
┌─────────────────────────────────────┐
│  Database (Supabase)                │  ← Knows about schema
│  (Tables, Fields, Types)            │    Doesn't know about business logic
└─────────────────────────────────────┘
```

But what we have is:

```
┌─────────────────────────────────────┐
│  Core Domain (@lucky/core)          │
│  Knows: Workflows, Evolution,       │
│  Also knows: wf_version_id,         │  ← WRONG
│            wf_invocation_id,        │    This shouldn't be here
│            field names, nullability │
└─────────────────────────────────────┘
            ↓ depends on
┌─────────────────────────────────────┐
│  Adapter (PassThrough)              │  ← Minimal translation
└─────────────────────────────────────┘
            ↓ depends on
┌─────────────────────────────────────┐
│  Database (Supabase)                │
└─────────────────────────────────────┘
```

The adapter isn't adapting. It's just passing through.

---

## Deeper: What The Adapter Doesn't Know It Should Own

### 1. **Entity Lifecycle Management**

Currently, the code treats insertion as a simple operation:

```typescript
// What callers think is happening:
persistence.createWorkflowInvocation({...})

// What actually happens:
// - Check if WF exists (sometimes)
// - Check if WFV exists (sometimes)
// - Check if WI exists (sometimes)
// - Decide to create, update, or error (inconsistently)
// - Set defaults like status='running', start_time=now() (sometimes)
// - Track who created it via clerkId (sourced from... where exactly?)
```

There's no clear contract. Different entry points do different things. Some auto-create parents, some don't. Some set defaults, some expect the caller to.

**Question it raises:** Who owns the entity lifecycle?
- The adapter (and has complete knowledge of states)?
- The caller (and can't accidentally create invalid sequences)?
- Split responsibility (and creates the current confusion)?

### 2. **Validation Responsibility**

When someone calls `createWorkflowInvocation`, is the adapter responsible for ensuring:
- The referenced `wf_version_id` exists?
- The workflow chain is valid?
- The `wf_invocation_id` hasn't been used before?
- The invocation ID format is valid?

Or is that the caller's job?

Currently: Ambiguous. Some validations happen in the adapter, some in the caller, some never.

### 3. **Metadata Handling (clerkId, timestamps)**

```typescript
// Today's code:
async createWorkflowInvocation(data: Tables<"WorkflowInvocation">): Promise<void> {
  const insertData: TablesInsert<"WorkflowInvocation"> = {
    wf_invocation_id: data.wf_invocation_id,
    wf_version_id: data.wf_version_id,
    status: "running",  // ← Where does this come from?
    start_time: new Date().toISOString(),  // ← Always now()?
    usd_cost: 0,  // ← Default? Or passed in?
    extras: data.extras || null,
    run_id: data.run_id || null,
    generation_id: data.generation_id || null,
    fitness: data.fitness || null,
    // ...
  }
}
```

Some fields are set by the adapter (status, start_time, usd_cost). Some come from the caller (run_id, generation_id). Some are optional and nullable.

**Who should decide these defaults?** The database schema? The adapter? The caller?

### 4. **The Implicit Assumptions**

The adapter makes undocumented assumptions:
- A "create" operation on an existing entity should upsert (not documented)
- Parent workflows should be auto-created if missing (not consistent)
- clerkId should come from execution context (but what if context is missing?)
- Invocation IDs are caller-provided (but this isn't enforced)

These assumptions live in people's heads, not in code.

---

## The Repo Context: Why This Matters Here

### Structure

```
packages/
├── @lucky/core/                    ← Workflow execution, evolution
│   ├── src/workflow/
│   ├── src/improvement/            ← GP, iterative evolution
│   ├── src/messages/
│   └── src/node/
├── @together/adapter-supabase/     ← This adapter
│   ├── src/supabase-persistence.ts
│   ├── src/evolution/
│   ├── src/workflows/
│   ├── src/persistence-interface.ts
│   └── src/memory-persistence.ts   ← In-memory fallback
├── @lucky/shared/                  ← Supabase types live here
│   ├── types/supabase.types.ts     ← Generated: Tables, TablesInsert, TablesUpdate
│   └── contracts/                  ← Business domain types (unused?)
└── apps/web/                       ← Frontend consuming this
```

### The Tight Coupling Chain

When Supabase schema changes (a field is added, a table is renamed):

1. `@lucky/shared` regenerates `supabase.types.ts`
2. Every file importing `TablesInsert<"Generation">` suddenly has different types
3. `@lucky/core` breaks because it imports these types directly
4. The adapter breaks too, even though it's supposed to buffer changes

**Example: If we rename `wf_version_id` → `version_id`**
- Database schema updates
- Supabase types change
- Core code breaks in 30 places
- Instead of 1 place (the adapter) handling the translation

### Why Type Safety Backfired Here

TypeScript gives us compile-time guarantees. But by exposing database types all the way to the application layer, we also expose all database schema changes. The safety becomes rigidity.

---

## Now: The Central Question

### The Question

**Should this adapter expose Supabase types directly to the core, or should it define its own domain entity types and translate between them?**

This single decision would determine:
- How coupling happens
- How resilient the system is to schema changes
- How clear the contracts are
- How testable the code becomes

### Sub-Question 1: **What Is an Entity, Actually?**

```typescript
// Option A: Entity = Database Row
type WorkflowVersion = Tables<"WorkflowVersion">
// Pro: Minimal code, direct mapping
// Con: Couples core to database, schema changes break everything

// Option B: Entity = Business Concept
type WorkflowVersion = {
  id: string
  workflowId: string
  dsl: unknown
  operation: "init" | "crossover" | "mutation" | "immigrant"
  generationId?: string
  // No database naming, no schema quirks
}
// Pro: Decoupled, clear contracts, schema-agnostic
// Con: Translation layer needed, some indirection
```

Which makes sense for this system? If you're building an autonomous workflow system that might live in 5 different databases over 10 years, which matters more?

### Sub-Question 2: **Who Owns the State Machine?**

When inserting, we have a state machine:
- Workflow exists or not
- WorkflowVersion exists or not
- WorkflowInvocation exists or not

Who enforces valid transitions?

```typescript
// Option A: Adapter enforces it
persistence.createWorkflowInvocation(data)
// ├─ Checks WFV exists
// ├─ Auto-creates WF if missing (with warning)
// └─ Validates state machine
// Result: Caller can't make mistakes, but adapter is complex

// Option B: Caller enforces it
// Caller must:
// ├─ Know to call ensureWorkflow first
// ├─ Know to call ensureWorkflowVersion second
// ├─ Know to call createWorkflowInvocation third
// Result: Simpler adapter, more powerful callers, higher chance of errors

// Option C: Split responsibility
persistence.createWorkflowInvocation(data, {
  autoCreateMissingParents: false,  // ← Explicit, caller decides
  upsertIfExists: false,
})
// Result: Clear contracts, no surprises
```

Which reduces bugs in practice?

### Sub-Question 3: **What Should Defaults Be?**

For WorkflowInvocation creation, several fields have "natural" defaults:

- `status`: Should default to "running" or should caller provide?
- `start_time`: Should default to `now()` or should caller provide?
- `usd_cost`: Should default to 0 or should caller provide?
- `end_time`: Should default to null always?

This seems small, but it's a decision about **who owns the semantics of "creating an invocation."**

If the adapter decides, it's saying: "I know what a freshly created invocation looks like."
If the caller decides, it's saying: "You (caller) know what's semantically correct."

For a system where invocations are created by the workflow runner (not humans), and their semantics are part of the workflow contract, who should decide?

### Sub-Question 4: **How Should Metadata Flow?**

Currently `clerkId` (who initiated this action) comes from:
- Execution context (implicit)
- Function parameter (explicit)
- Sometimes both (confusing)

This is security-relevant. If the system tracks that "User A triggered this evolution run," that data must flow correctly.

```typescript
// Option A: From context only
const executionContext = getExecutionContext()
const clerkId = executionContext?.get("principal")?.clerk_id
// Pro: Automatic, always consistent
// Con: Implicit, can be null, hard to override

// Option B: From parameter only
persistence.createWorkflowVersion(data, { clerkId })
// Pro: Explicit, testable
// Con: Parameter fatigue, easy to forget

// Option C: Parameter overrides context
const clerkId = options?.clerkId ?? executionContext?.get("principal")?.clerk_id
// Pro: Flexible with sensible default
// Con: Multiple paths to same value
```

For a system built on autonomous execution, which prevents the most bugs?

### Sub-Question 5: **Should Testing Be Easy?**

Currently, there are two implementations:
- `SupabasePersistence` (real database)
- `InMemoryPersistence` (test fallback)

Both implement the same interface. But when the interface is unclear (as it is now), they diverge:

```typescript
// If SupabasePersistence auto-creates missing parents
// but InMemoryPersistence doesn't,
// then tests pass but production fails.
```

**How should the interface be designed so that multiple implementations stay in sync?**

---

## The Core Problem (All of This Points To)

The adapter is suffering from **architectural ambiguity about its responsibilities.**

It's trying to be:
1. **A passthrough** (just ferry data to/from database)
2. **A validator** (check that operations are valid)
3. **A state machine** (enforce entity lifecycle)
4. **A default provider** (set sensible defaults)
5. **A context resolver** (figure out who's doing this)

All at once, with no clear boundaries. When all five of these happen simultaneously in unclear ways, you get:
- Type confusion (is this a create or an update?)
- Semantic confusion (what defaults apply?)
- Testing confusion (what's the contract?)
- Scaling confusion (how do I add a new entity type?)

### Why This Happened

The system evolved. It started simple. Each new requirement added another responsibility:
- "We need to track who did this" → add clerkId handling
- "Auto-create parent WFs to reduce boilerplate" → add state machine
- "Set sensible defaults" → add default setting
- "Track evolution runs" → add more validation

Each decision made local sense. Together, they created a system that's trying to do too much without clear boundaries.

### What Happens If Unsolved

Every new entity type or persistence layer (if you ever move to PostgreSQL, or add Redis caching, etc.) will repeat the same confusion:
- Should it auto-create parents?
- What are the defaults?
- Should tests match production behavior?
- Who owns validation?

The codebase will be increasingly hard to reason about, test, and modify.

---

## In Summary: The Question to Answer

**Given that:**
- This adapter sits between autonomous domain logic and a database
- Multiple implementations might exist (Supabase, in-memory, future adapters)
- Schema and infrastructure might change
- The system needs to be testable and reliable

**What is the one architectural principle this adapter should follow, such that all other decisions (entity types, defaults, validation, metadata, state machines) become obvious?**

---

## Why We're Asking Now

Because we fixed the immediate TypeScript errors. The code type-checks now. But if we don't ask this question first, we'll find ourselves 6 months from now with a more sophisticated version of the same problem: a persistence layer that's unclear about what it's responsible for, making it fragile to change.

The right answer to this question would make future changes straightforward. The wrong answer (or no clear answer) will make this adapter increasingly hard to maintain.

---

*This document is a question worth taking seriously before writing code. Because the code that gets written after answering this question will be very different from the code that gets written if we skip this step.*
