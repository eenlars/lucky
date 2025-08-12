## Frontend Run Configuration Store – Plan and Schemas

### Why

- **Persist datasets**: Avoid retyping IO cases across mode switches/reloads.
- **Unify run paths**: Use one invocation path for graph “Run with Prompt” and eval “Run & Evaluate”.
- **Speed iteration**: Quickly pick or import a dataset; run all with cancel and concurrency.

### Current state (summary)

- `EditModeSelector` keeps eval state locally: `ios`, `goal`, `busyIds`, `resultsById`, ad‑hoc `AbortController`s.
- Graph header uses `window.prompt` then posts to `/api/workflow/invoke`.
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
// Reuse from core:
// - WorkflowIO (ingestion.types): { workflowInput: string; workflowOutput: { output: any; outputSchema?: OutputSchema } }
// - InvokeWorkflowResult (runner/types): returned result shape including fitness, costs, and invocation id

// Minimal UI-only wrapper to attach a stable row id
export type DatasetRow = {
  id: string
  io: WorkflowIO // from core
}

export type RunConfigState = {
  datasetName?: string
  goal: string
  prompt: string
  rows: DatasetRow[]
  // Store backend-typed results directly
  resultsById: Record<string, InvokeWorkflowResult | { error: string }>
  // Not persisted
  busyIds: Record<string, true>
  options: { concurrency: number }
}
```

Notes:

- The UI table may still collect `input` and an `expected` string. When adding a row, map to `WorkflowIO` as `{
  workflowInput: input,
  workflowOutput: { output: expected }
}` (optionally set `outputSchema`).
- Results are stored as `InvokeWorkflowResult` (from core) keyed by row id; UI reads `fitness`, `queueRunResult.finalWorkflowOutput`, and `workflowInvocationId` directly.

### Backend request/response (existing routes)

- POST `/api/workflow/run-many`

Request body:

```ts
type RunManyRequest = {
  dslConfig: WorkflowConfig
  cases: { workflowInput: string; workflowOutput: any }[]
  goal?: string
}
```

Response body:

```ts
type RunManyResponse = {
  success: true
  results: Array<
    | { success: true; data: InvokeWorkflowResult[] }
    | { success: false; error: string }
  >
}

Proposed alignment with core (optional, reduces UI mapping): accept `cases: WorkflowIO[]` alongside the current shape, preferring `WorkflowIO[]` when present.
```

- POST `/api/workflow/invoke`

Request body (union; typical UI usage shown):

```ts
type InvokeRequest = {
  dslConfig: WorkflowConfig
  evalInput: EvaluationText // { type: 'text', question, answer, goal, workflowId }
}
```

Response body:

```ts
// if success: { success: true, data: InvokeWorkflowResult[] }
// if error:   { error: string }
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

- Eval mode: for each `DatasetRow.io: WorkflowIO`, send `cases: [{ workflowInput: io.workflowInput, workflowOutput: io.workflowOutput.output }]` to `/api/workflow/run-many` (+ `goal`).
- Graph "Run with Prompt": use `/api/workflow/invoke` with `EvaluationText` where `question = prompt` and `answer = ""`.

---

## Integration plan (minimal)

1. Create `useRunConfigStore`

- New file: `app/src/stores/run-config-store.ts` using Zustand + `persist`.
- State: `datasetName`, `goal`, `prompt`, `ios`, `resultsById`, `busyIds` (non‑persisted), `options`.
- Actions: `addIO`, `updateIO`, `removeIO`, `clearResults`, `importIOs`, `exportIOs`, `setGoal`, `setPrompt`, `setDatasetName`, `setOptions`.
- Run helpers: `runOne(cfg, io, goal?)`, `runAll(cfg)`, `cancel(id)`, `cancelAll()`.

2. Rewire eval mode in `EditModeSelector`

- Replace local state with selectors from `useRunConfigStore`.
- Compute `cfg` via `exportToJSON` → `toWorkflowConfig` → `loadFromDSLClient` once, then call `runAll(cfg)` or `runOne(cfg, io)`.
- Pass store callbacks to `WorkflowIOTable`.

3. Update Graph header “Run with Prompt”

- Replace `window.prompt` flow to use store `prompt` (with fallback prompt input if empty).
- Add an IO row for the prompt and call `runOne(cfg, io)` (or call `/api/workflow/invoke` and surface result in a toast).

4. Optional: `RunConfigBar` component

- Expose dataset name, import/export JSON, and `concurrency` selector; backed by the store.

5. Persistence and DX

- Persist dataset and options in localStorage (`run-config/v1`).
- Keep `busyIds` and controllers in memory only.

---

## Open questions for you

- Scope of persistence: per workflow version or global across workflows?
- Should we support named datasets (save/load multiple presets) and share via API (team-wide), or keep local only for now?
- For “Run with Prompt”: should we also run an evaluation (needs an expected answer) or do a run-only flow?
- Expected format: keep simple string, or allow structured expected output with an optional Zod `outputSchema` selection in the UI?
- Defaults: desired concurrency and any cost/time budget constraints to enforce client‑side?
- Results persistence: keep last results after reload, or clear on mount? Add a Clear Results action?
- Surfacing metrics: display usdCost per IO (from `InvokeWorkflowResult.usdCost`) and an aggregate in eval mode?
- Any other places to consume the store (e.g., JSON editor page, traces page quick‑rerun)?

---

## Next steps (if approved)

- Implement `useRunConfigStore` with the schema above.
- Wire `EditModeSelector` eval mode and Graph header button to the store.
- Add a minimal `RunConfigBar` (dataset name + concurrency + import/export) if desired.
- Iterate on dataset sharing/export based on your answers.
