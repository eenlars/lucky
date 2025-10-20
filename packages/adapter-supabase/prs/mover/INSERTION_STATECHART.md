# Supabase Adapter - Insertion State Chart

Complete state machine for all insertion operations. Handles edge cases with strict validation and optional warnings.

## Core Principles

1. **Always possible:** Workflow insertion (no dependencies)
2. **Guarded:** Workflow Version insertion (can auto-insert missing parent, warns)
3. **Strict:** Workflow Invocation insertion (requires parent chain to exist, no auto-creation)
4. **Never without ID:** Workflow Invocation requires caller-provided ID (no generation)

---

## State Space

### Workflow (WF)

```
States:
  EXISTS: wf_id found in database
  NOT_EXISTS: wf_id not found in database
```

### Workflow Version (WFV)

```
States:
  EXISTS: wf_version_id found in database
  NOT_EXISTS: wf_version_id not found in database

Dependencies: Must reference valid workflow_id (WF must exist)
```

### Workflow Invocation (WI)

```
States:
  EXISTS: wf_invocation_id found in database
  NOT_EXISTS: wf_invocation_id not found in database

Dependencies:
  - Must reference valid wf_version_id (WFV must exist)
  - wf_version_id → workflow_id chain must exist
  - REQUIRES caller-provided wf_invocation_id (NOT generated)
```

---

## Insertion Operations

### 1. INSERT WORKFLOW

```
Operation: insertWorkflow(data: TablesInsert<"Workflow">)

Input Requirements:
  - wf_id: string (caller provided, required)
  - description: string (required)
  - clerk_id?: string (optional, from context or param)

State Transitions:

  WF NOT_EXISTS
    └─> CREATE
        ├─ Success → WF EXISTS ✅
        └─ Error → WF NOT_EXISTS (no insert)

  WF EXISTS
    ├─ Option A: UPSERT (replace)
    │   └─> WF EXISTS ⚠️ WARNING: "Workflow already exists, updating"
    │
    ├─ Option B: SKIP
    │   └─> WF EXISTS ⚠️ WARNING: "Workflow already exists, skipping"
    │
    └─ Option C: ERROR
        └─ Throw: "Workflow already exists"

Recommended: Option A (upsert is safe for workflows)
```

---

### 2. INSERT WORKFLOW VERSION

```
Operation: insertWorkflowVersion(data: TablesInsert<"WorkflowVersion">)

Input Requirements:
  - wf_version_id: string (caller provided, or generate: "wf_ver_${genShortId()}")
  - workflow_id: string (caller provided, required)
  - dsl: Json (required)
  - commit_message: string (required)
  - operation: "init" | "crossover" | "mutation" | "immigrant" (required)
  - generation_id?: string (optional)
  - clerk_id?: string (optional, from context)
  - [other fields with defaults]

State Transitions:

Case 1: WF EXISTS + WFV NOT_EXISTS
  └─> CREATE WFV ✅
      └─> WFV EXISTS

Case 2: WF NOT_EXISTS + WFV NOT_EXISTS
  ├─ Option A: AUTO-INSERT WF first, then WFV
  │   └─> ⚠️ WARNING: "Parent workflow does not exist. Auto-creating with description='${commit_message}'"
  │       └─> WF EXISTS + WFV EXISTS ✅
  │
  ├─ Option B: ERROR (strict mode)
  │   └─ Throw: "Workflow ${workflow_id} not found"
  │
  └─ Option C: REQUIRE
      └─ Throw: "Must insert workflow first"

  Recommended: Option A (with warning) - enables single-step insertion

Case 3: WF EXISTS + WFV EXISTS
  ├─ Option A: UPSERT (by wf_version_id)
  │   └─> WFV EXISTS ⚠️ WARNING: "Workflow version already exists, updating"
  │
  └─ Option B: ERROR
      └─ Throw: "Workflow version already exists"

  Recommended: Option A (safe due to upsert on wf_version_id)

Case 4: WF NOT_EXISTS + WFV EXISTS
  └─ ERROR ❌ (inconsistent state - version exists but parent doesn't)
     └─ Throw: "Workflow ${workflow_id} not found, cannot update version"

Edge Cases:
  - wf_version_id collision: Check before insert
    - If exists with SAME workflow_id → upsert
    - If exists with DIFFERENT workflow_id → ERROR: "version ID already used by different workflow"
```

---

### 3. INSERT WORKFLOW INVOCATION

```
Operation: insertWorkflowInvocation(data: TablesInsert<"WorkflowInvocation">)

Input Requirements:
  - wf_invocation_id: string (REQUIRED, MUST BE provided by caller, NOT generated)
  - wf_version_id: string (required)
  - workflow_id?: string (optional, can be inferred from wf_version_id)
  - run_id?: string (optional, for evolution tracking)
  - generation_id?: string (optional, for evolution tracking)
  - clerk_id?: string (optional, from context)
  - [defaults: status='running', start_time=now(), usd_cost=0, end_time=null]

State Transitions:

Case 1: WF EXISTS + WFV EXISTS + WI NOT_EXISTS
  └─> CREATE WI ✅
      └─> WI EXISTS

Case 2: WF NOT_EXISTS + WFV EXISTS
  └─ ERROR ❌ (inconsistent)
     └─ Throw: "Workflow ${inferred_workflow_id} not found. Cannot create invocation."
     └─ Action: Caller must insert WF first

Case 3: WF EXISTS + WFV NOT_EXISTS + WI NOT_EXISTS
  ├─ Option A: AUTO-INSERT WFV first, then WI
  │   └─> ⚠️ WARNING: "Workflow version not found. Must insert WF version before invocation."
  │       └─ Actually, DON'T auto-insert (too risky - need dsl config)
  │       └─ Throw: "Workflow version not found"
  │
  └─ Option B: ERROR (strict)
     └─ Throw: "Workflow version ${wf_version_id} not found"

  Recommended: Option B (strict - don't auto-insert WFV without DSL)

Case 4: WF EXISTS + WFV EXISTS + WI EXISTS
  ├─ Option A: UPSERT (update existing)
  │   └─> WI EXISTS ⚠️ WARNING: "Workflow invocation already exists, updating"
  │
  └─ Option B: ERROR
     └─ Throw: "Workflow invocation already exists"

  Recommended: Option A (safe for updates)

Case 5: MISSING wf_invocation_id
  └─ ERROR ❌ (CRITICAL)
     └─ Throw: "wf_invocation_id is required. Cannot auto-generate for invocations."
     └─ Reason: Invocations are created by workflow runner, must have known ID

Case 6: Invalid wf_version_id (doesn't exist)
  └─ ERROR ❌
     └─ Lookup: SELECT workflow_id FROM WorkflowVersion WHERE wf_version_id = ?
     └─ If not found → Throw: "Workflow version ${wf_version_id} not found"

Edge Cases:
  - wf_invocation_id collision:
    - Check uniqueness before insert
    - If exists → check if same wf_version_id
      - If same → update (upsert behavior)
      - If different → ERROR: "Invocation ID already used for different workflow"

  - run_id + generation_id consistency:
    - If run_id provided without generation_id → ⚠️ WARNING: "Evolution run_id provided without generation_id"
    - If generation_id provided without run_id → ⚠️ WARNING: "Evolution generation_id provided without run_id"
```

---

## Complete State Matrix

### All Combinations

```
WF         | WFV        | WI         | Operation      | Action                          | Result
-----------|------------|------------|----------------|--------------------------------|----------
NOT_EXISTS | NOT_EXISTS | NOT_EXISTS | Insert WI      | ERROR                          | ❌ Fail
NOT_EXISTS | NOT_EXISTS | NOT_EXISTS | Insert WFV     | Auto-create WF + create WFV    | ✅ + ⚠️
NOT_EXISTS | NOT_EXISTS | NOT_EXISTS | Insert WF      | Create WF                      | ✅
           |            |            |                |                                |
NOT_EXISTS | NOT_EXISTS | EXISTS     | Insert WI      | ERROR (WI exists, WF missing)   | ❌ Inconsistent
NOT_EXISTS | EXISTS     | NOT_EXISTS | Insert WI      | ERROR (WF missing)             | ❌ Fail
NOT_EXISTS | EXISTS     | EXISTS     | [state only]   | Inconsistent DB state          | ⚠️ Flag
           |            |            |                |                                |
EXISTS     | NOT_EXISTS | NOT_EXISTS | Insert WI      | ERROR (WFV missing)            | ❌ Fail
EXISTS     | NOT_EXISTS | NOT_EXISTS | Insert WFV     | Create WFV                     | ✅
EXISTS     | NOT_EXISTS | NOT_EXISTS | Insert WF      | Upsert WF                      | ✅ + ⚠️
           |            |            |                |                                |
EXISTS     | NOT_EXISTS | EXISTS     | [state only]   | Inconsistent DB state          | ⚠️ Flag
EXISTS     | EXISTS     | NOT_EXISTS | Insert WI      | Create WI                      | ✅
EXISTS     | EXISTS     | NOT_EXISTS | Insert WFV     | Upsert WFV                     | ✅ + ⚠️
EXISTS     | EXISTS     | NOT_EXISTS | Insert WF      | Upsert WF                      | ✅ + ⚠️
           |            |            |                |                                |
EXISTS     | EXISTS     | EXISTS     | Insert WI      | Upsert WI                      | ✅ + ⚠️
EXISTS     | EXISTS     | EXISTS     | [all ops]      | All operations upsert          | ✅ + ⚠️
```

---

## Warning Messages

### Workflow Warnings

```
1. "Workflow already exists (wf_id: ${id}). Updating."
   - Severity: INFO
   - Action: Proceed with upsert
   - When: User calls insertWorkflow twice for same ID

2. "Workflow not found for version (workflow_id: ${id}). Auto-creating."
   - Severity: WARN
   - Action: Create missing parent
   - When: insertWorkflowVersion called without parent existing
```

### Workflow Version Warnings

```
1. "Workflow version already exists (wf_version_id: ${id}). Updating."
   - Severity: INFO
   - Action: Proceed with upsert
   - When: User calls insertWorkflowVersion twice for same ID

2. "Workflow version not found (wf_version_id: ${id}). Cannot create invocation."
   - Severity: ERROR
   - Action: Throw, require insertWorkflowVersion first
   - When: insertWorkflowInvocation references missing WFV
```

### Workflow Invocation Warnings

```
1. "Workflow invocation ID is required. Cannot auto-generate."
   - Severity: ERROR
   - Action: Throw
   - Reason: Invocations must have predictable IDs from workflow runner

2. "Workflow invocation already exists (wf_invocation_id: ${id}). Updating."
   - Severity: INFO
   - Action: Proceed with upsert
   - When: Update call on existing invocation

3. "Evolution tracking inconsistency: run_id provided without generation_id"
   - Severity: WARN
   - Action: Proceed but log
   - When: Only partial evolution context provided

4. "Evolution tracking inconsistency: generation_id provided without run_id"
   - Severity: WARN
   - Action: Proceed but log
   - When: Only partial evolution context provided
```

---

## Implementation Strategy

### Interface Design

```typescript
// Current: Too permissive, doesn't match workflow-persistence
interface IPersistence {
  createWorkflowVersion(data: TablesInsert<"WorkflowVersion">): Promise<void>
  createWorkflowInvocation(data: Tables<"WorkflowInvocation">): Promise<void>
  updateWorkflowInvocation(data: TablesUpdate<"WorkflowInvocation">): Promise<void>
}

// Proposed: Separate create/update, handle auto-creation and warnings
interface IPersistence {
  // Workflows - upsert allowed
  ensureWorkflow(data: TablesInsert<"Workflow">, options?: UpsertOptions): Promise<void>

  // Versions - create with auto-parent, warn on upsert
  createWorkflowVersion(data: TablesInsert<"WorkflowVersion">, options?: CreateVersionOptions): Promise<void>

  // Invocations - strict, require ID, support upsert for updates
  createWorkflowInvocation(data: TablesInsert<"WorkflowInvocation">, options?: CreateInvocationOptions): Promise<void>
  updateWorkflowInvocation(data: TablesUpdate<"WorkflowInvocation">): Promise<void>
}

interface UpsertOptions {
  allowUpsert?: boolean  // default: true
  onUpsert?: "warn" | "error" | "silent"
  clerkId?: string
}

interface CreateVersionOptions {
  autoCreateParentWorkflow?: boolean  // default: true
  onUpsertExisting?: "update" | "skip" | "error"  // default: "update"
  clerkId?: string
}

interface CreateInvocationOptions {
  onUpsertExisting?: "update" | "error"  // default: "update", no "skip" - must decide
  clerkId?: string
  // NO auto-generation of wf_invocation_id
  // NO auto-creation of parent WFV
}
```

### Validation Chain

```
createWorkflowInvocation(data)
  ├─ 1. Validate wf_invocation_id exists and is string
  │     └─ If missing → Throw: "wf_invocation_id required"
  │
  ├─ 2. Check WFV exists
  │     └─ If not → Throw: "Workflow version not found"
  │
  ├─ 3. Infer workflow_id from WFV
  │     └─ Check WF exists
  │     └─ If not → Throw: "Workflow not found (inconsistent DB state)"
  │
  ├─ 4. Check WI exists
  │     └─ If exists → Apply upsert strategy (warn or error)
  │
  └─ 5. Insert/upsert with defaults
      ├─ status: "running"
      ├─ start_time: now()
      ├─ usd_cost: 0 or data.usd_cost
      └─ clerk_id: from context or param
```

---

## Questions for Implementation

1. **Auto-parent creation for WFV:** Should we always create missing WF when inserting WFV? Or require explicit opt-in?

2. **Upsert strategy:** When entity exists, should we:
   - Always upsert (most lenient)?
   - Require explicit `force` flag?
   - Error by default (most strict)?

3. **Invocation ID generation:** Can be auto-generated (e.g., `"wfi_${genShortId()}"`) or always required from caller?

4. **clerkId source:** Should it come from execution context or be passed as parameter or both?

5. **Warning output:** Console.warn, structured logger, or callback?

6. **Transaction support:** Should multi-entity inserts be atomic?

---

## References

- Workflow: Low dependencies (no parent required)
- WorkflowVersion: Medium dependencies (WF must exist, can auto-create)
- WorkflowInvocation: High dependencies (WFV must exist, strict, requires ID)
