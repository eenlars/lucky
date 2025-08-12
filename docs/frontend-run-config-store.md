## Frontend Run Configuration Store – Plan and Schemas

### Why

- **Persist datasets**: Avoid retyping IO cases across mode switches/reloads.
- **Unify run paths**: Use one invocation path for graph “Run with Prompt” and eval “Run & Evaluate”.
- **Speed iteration**: Quickly pick or import a dataset; run all with cancel and concurrency.

### Current state (summary)

- `EditModeSelector` keeps eval state locally: `cases` (formerly `ios`), `goal`, `busyIds`, `resultsById`, ad‑hoc `AbortController`s.
- Graph header currently uses `window.prompt` and posts to `/api/workflow/invoke` with an ad‑hoc body; this should be updated to the proper `InvocationInput` shape.
- `useWorkflowRunner` is stubbed; no shared store for runs.

### Objectives

- Introduce a small Zustand store for run configuration and dataset IOs (persisted to localStorage).
- Single run helpers: `runOne` and `runAll` that call existing API routes.
- Shared prompt/goal/options across graph, JSON, and eval modes.
- Cancellation + simple concurrency for a good DX.

---

## Schemas

### Frontend state (store) schema

Reuse core types wherever possible; keep only a thin UI wrapper for rows.

```ts
// Reuse from core (read-only in UI):
// - InvokeWorkflowResult (core/src/workflow/runner/types.ts)
//   Includes: { workflowInvocationId, queueRunResult, fitness?, feedback?, usdCost?, outputMessage? }
// - WorkflowIO (core/src/workflow/ingestion/ingestion.types.ts)
//   Canonical backend shape for a single case; UI maps to this when calling APIs.

// Minimal UI-only row (kept separate from core's WorkflowIO for clarity in the table)
export type CaseRow = {
  id: string
  input: string
  expected: string
}

export type RunOptions = { concurrency: number }

export type RunConfigState = {
  datasetName?: string
  goal: string
  prompt: string
  cases: CaseRow[]
  // Store backend-typed results directly for drift‑safety
  resultsById: Record<
    string,
    | import("@core/workflow/runner/types").InvokeWorkflowResult
    | { error: string }
  >
  // Not persisted
  busyIds: Set<string>
  options: RunOptions
}
```

Notes:

- The UI table collects `input` and `expected` strings. When calling the backend, map to `WorkflowIO` as `{ workflowInput: input, workflowOutput: { output: expected } }` (optionally set `outputSchema`).
- Store results as `InvokeWorkflowResult` (from core) keyed by row id; UI reads `fitness`, `queueRunResult.finalWorkflowOutput`, `workflowInvocationId`, and `queueRunResult.totalCost` directly.

### Backend request/response (existing routes)

- POST `/api/workflow/run-many`

Request body:

```ts
type RunManyRequest = {
  dslConfig: WorkflowConfig
  cases: { workflowInput: string; workflowOutput: any }[] // accepted today
  goal?: string
}
```

Response body:

```ts
type RunManyResponse = {
  success: true
  results: Array<
    | {
        success: true
        data: import("@core/workflow/runner/types").InvokeWorkflowResult[]
      }
    | { success: false; error: string }
  >
}

// Optional future improvement (reduces UI mapping):
// accept `cases: WorkflowIO[]` in addition to the current shape;
// prefer `WorkflowIO[]` when present.
```

- POST `/api/workflow/invoke`

Request body (union; typical UI usage shown):

```ts
// Expects `InvocationInput` from core (one of: workflowVersionId | filename | dslConfig)
type InvokeRequest = {
  dslConfig: WorkflowConfig
  evalInput: EvaluationText // { type: 'text', question, answer, goal, workflowId }
}
```

Response body:

```ts
// Success: { success: true, data: import("@core/workflow/runner/types").InvokeWorkflowResult[] }
// Error:   { error: string }
```

Key referenced types (from core):

```ts
// core/src/workflow/runner/types.ts
export interface InvokeWorkflowResult extends RunResult {
  fitness?: FitnessOfWorkflow
  feedback?: string
  usdCost?: number
  outputMessage?: string
}

export interface RunResult {
  workflowInvocationId: string
  queueRunResult: QueueRunResult
}

export interface QueueRunResult {
  success: boolean
  agentSteps: AgentSteps
  finalWorkflowOutput: string
  error?: string
  totalTime: number
  totalCost: number
}

// core/src/workflow/ingestion/ingestion.types.ts
export interface EvaluationText {
  type: "text"
  question: string
  answer: string
  goal: string
  workflowId: string
}
```

Mapping UI → backend:

- Eval mode: for each `CaseRow`, send `cases: [{ workflowInput: input, workflowOutput: expected }]` to `/api/workflow/run-many` (+ `goal`).
- Graph "Run with Prompt": call `/api/workflow/invoke` with `InvocationInput` shape:
  ```ts
  {
    dslConfig,
    evalInput: {
      type: "text",
      question: prompt,
      answer: "", // run-only; no evaluation if no expected answer is supplied
      goal: goal || "Prompt run",
      workflowId: "adhoc-ui",
    }
  }
  ```

---

## Integration plan (minimal)

1. Create `useRunConfigStore`

- New file: `app/src/stores/run-config-store.ts` using Zustand + `persist` (localStorage).
- State: `datasetName`, `goal`, `prompt`, `cases`, `resultsById`, `busyIds: Set<string>` (non‑persisted), `options`.
- Actions: `addCase`, `updateCase`, `removeCase`, `clearResults`, `importCases`, `exportCases`, `setGoal`, `setPrompt`, `setDatasetName`, `setOptions`.
- Run helpers: `runOne(cfg, row, goal?)`, `runAll(cfg)`, `cancel(id)`, `cancelAll()` with per‑row `AbortController`s held in memory.

2. Rewire eval mode in `EditModeSelector`

- Replace local state with selectors from `useRunConfigStore`.
- Compute `cfg` via `exportToJSON` → `toWorkflowConfig` → `loadFromDSLClient` once, then call `runAll(cfg)` or `runOne(cfg, row)`.
- Pass store callbacks to `WorkflowIOTable` (prop may remain `ios` temporarily but should be renamed to `cases`).

3. Update Graph header “Run with Prompt”

- Replace `window.prompt` flow to use store `prompt` (with fallback prompt input if empty).
- Option A (preferred): Call `/api/workflow/invoke` with correct `InvocationInput` (see Mapping) and surface result in a toast + link to trace via `workflowInvocationId`.
- Option B: Create a transient `CaseRow` and reuse `runOne(cfg, row)` for uniform handling.

4. Optional: `RunConfigBar` component

- Expose dataset name, import/export JSON, and `concurrency` selector; backed by the store.

5. Persistence and DX

- Persist dataset and options in localStorage (`run-config/v1`).
- Keep `busyIds` and controllers in memory only.
- Scope: global across workflows for now (simple). We can later namespace by `wf_version_id` if needed.

---

## Open questions for you

- Scope of persistence: per workflow version or global across workflows?
- Should we support named datasets (save/load multiple presets) and share via API (team-wide), or keep local only for now?
- For “Run with Prompt”: should we also run an evaluation (needs an expected answer) or do a run-only flow?
- Expected format: keep simple string, or allow structured expected output with an optional Zod `outputSchema` selection in the UI?
- Defaults: desired concurrency and any cost/time budget constraints to enforce client‑side?
- Results persistence: keep last results after reload, or clear on mount? Add a Clear Results action?
- Surfacing metrics: display per‑case `queueRunResult.totalCost` and an aggregate in eval mode?
- Any other places to consume the store (e.g., JSON editor page, traces page quick‑rerun)?

---

## Next steps (if approved)

- Implement `useRunConfigStore` with the schema above.
- Wire `EditModeSelector` eval mode and Graph header button to the store; fix `/api/workflow/invoke` call to use proper `InvocationInput`.
- Add a minimal `RunConfigBar` (dataset name + concurrency + import/export) if desired.
- Iterate on dataset sharing/export based on your answers.

---

## Grounded core notes and small refactor suggestions

- The core already defines `InvokeWorkflowResult` in `core/src/workflow/runner/types.ts`. This is the type the UI should store and read.
- In `core/src/workflow/runner/invokeWorkflow.ts`, when evaluation is performed, the returned objects currently add a convenience alias `finalWorkflowOutputs` (plural) pointing to `queueRunResult.finalWorkflowOutput` (singular).
  - Suggestion (non-breaking, grounded):
    - Prefer a single source of truth: always read `queueRunResult.finalWorkflowOutput`.
    - Mark `finalWorkflowOutputs` as deprecated internally and remove it in a future minor release to avoid confusion.
- Cost fields:
  - Per‑case cost is available at `queueRunResult.totalCost`. The top‑level `RS` wrapper already returns an aggregated usd cost as the second value in `R.success`. No change needed in types; just document in UI how to read these values.
- Naming alignment:
  - Standardize on “case(s)” for UI rows and “WorkflowIO” for backend ingestion types.
  - Avoid overloading the term “IO” in UI components to reduce confusion with core types.

## No-database operation

- The run configuration store is purely client‑side and persisted to localStorage. No DB is required for the store.
- Core invocation and evaluation will continue to persist workflow invocations/traces via existing core persistence (file/DB) as configured by environment; this is orthogonal to the UI store.
