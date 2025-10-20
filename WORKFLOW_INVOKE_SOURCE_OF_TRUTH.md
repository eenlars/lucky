# Workflow Invocation - Source of Truth

**Generated:** 2025-10-19
**Purpose:** Complete reference for all modules, types, schemas, and helpers needed to wire workflow invocation correctly.

---

## Table of Contents

1. [Schemas & Server Helpers](#schemas--server-helpers)
2. [Workflow Loading & Validation](#workflow-loading--validation)
3. [Invocation Plumbing & Types](#invocation-plumbing--types)
4. [Auth & Secrets](#auth--secrets)
5. [Provider/Model Setup](#providermodel-setup)
6. [MCP & Transforms](#mcp--transforms)
7. [Runner & Result Typing](#runner--result-typing)
8. [Observation](#observation)
9. [Misc Infra](#misc-infra)

---

## Schemas & Server Helpers

### API Schemas (`apps/web/src/lib/api/schemas.ts`)

```typescript
// Main invoke endpoint schema
apiSchemas["workflow/invoke"] = {
  req: z.object({
    workflowVersionId: z.string().min(1),
    evalInput: EvaluationInputSchema,
  }),
  res: ApiResponse(
    z.object({
      output: z.unknown(),
      invocationId: z.string().optional(),
      traceId: z.string().optional(),
    }),
  ),
}

// Response envelope types
const SuccessEnvelope = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    error: z.null().optional(),
  })

const FailureEnvelope = z.object({
  success: z.literal(false),
  data: z.null().optional(),
  error: ErrorEnvelope,
})

const ErrorEnvelope = z.object({
  code: z.string(),
  message: z.string(),
  timestamp: z.string().datetime(),
  details: z.unknown().optional(),
})

export const ApiResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([SuccessEnvelope(dataSchema), FailureEnvelope])

export type Endpoint = keyof typeof apiSchemas
export type Req<E extends Endpoint> = z.infer<(typeof apiSchemas)[E]["req"]>
export type Res<E extends Endpoint> = z.infer<(typeof apiSchemas)[E]["res"]>
```

### Server Helpers (`apps/web/src/lib/api/server.ts`)

```typescript
/**
 * Validates and parses request body against endpoint schema
 * Returns parsed data or NextResponse error
 */
export async function handleBody<E extends Endpoint>(
  endpoint: E,
  req: NextRequest
): Promise<Req<E> | NextResponse>

/**
 * Type guard for handleBody error responses
 */
export const isHandleBodyError = (x: unknown): x is NextResponse =>
  x instanceof NextResponse

/**
 * Creates validated JSON response
 */
export function alrighty<E extends Endpoint>(
  endpoint: E,
  payload: Res<E>,
  init?: ResponseInit
): NextResponse

/**
 * Creates error response in standard format
 */
export function fail<E extends Endpoint>(
  endpoint: E,
  message: string,
  options?: { code?: string; status?: number }
): NextResponse
```

---

## Workflow Loading & Validation

### Database Workflow Loader (`apps/web/src/features/workflow-or-chat-invocation/lib/config-load/database-workflow-loader.ts`)

```typescript
export interface WorkflowLoadResult {
  success: boolean
  config?: WorkflowConfig
  inputSchema?: JsonSchemaDefinition
  outputSchema?: JsonSchemaDefinition
  /** The resolved workflow version ID when loaded from database */
  resolvedWorkflowVersionId?: string
  /** Source: 'version' | 'parent' | 'demo' */
  source?: "version" | "parent" | "demo"
  error?: {
    code: number
    message: string
  }
}

export type WorkflowIdMode = "workflow_version" | "workflow_parent"

/**
 * Loads workflow configuration with support for both workflow IDs (wf_*) and version IDs (wf_ver_*)
 *
 * @param workflowId - Either a workflow ID (wf_*) or version ID (wf_ver_*)
 * @param principal - Authenticated user principal (for access control)
 * @param mode - Optional: Enforce specific ID type
 * @param options - Additional options like returnDemoOnNotFound
 */
export async function loadWorkflowConfig(
  workflowId: string,
  principal?: Principal,
  mode?: WorkflowIdMode,
  options?: { returnDemoOnNotFound?: boolean }
): Promise<WorkflowLoadResult>

/**
 * Get the demo workflow configuration
 */
export function getDemoWorkflow(): WorkflowLoadResult
```

### Config Loader (`apps/web/src/features/workflow-or-chat-invocation/lib/config-load/config-loader.ts`)

```typescript
export type WorkflowConfigResult = {
  config: WorkflowConfig | null
  source: "dsl" | "file" | "database" | "none"
}

/**
 * Load workflow configuration from various input sources
 */
export async function loadWorkflowConfigFromInput(
  input: InvocationInput
): Promise<WorkflowConfigResult>
```

### Input Schema Validator (`apps/web/src/features/workflow-or-chat-invocation/lib/validation/input-schema-validator.ts`)

```typescript
export class SchemaValidationError extends Error {
  constructor(
    public readonly errorMessage: string,
    public readonly details: Array<{
      path: string
      message: string
      params?: unknown
    }>
  )
}

/**
 * Validate input data against a workflow's input schema (if defined)
 * @throws {SchemaValidationError} If validation fails
 */
export function validateWorkflowInputSchema(
  input: unknown,
  inputSchema?: JsonSchemaDefinition
): void

export function validateInvocationInputSchema(
  input: InvocationInput,
  workflowConfig: WorkflowConfig | null
): void
```

### Input Validator (`apps/web/src/features/workflow-or-chat-invocation/lib/validation/input-validator.ts`)

```typescript
/**
 * Validate workflow invocation input against security and auth constraints
 * @throws {InvalidWorkflowInputError} If validation fails
 */
export function validateWorkflowInput(
  principal: Principal,
  filename?: string
): void
```

### Workflow Config Type (`packages/shared/src/contracts/workflow.ts`)

```typescript
export const WorkflowNodeConfigSchema = z.object({
  __schema_version: z.number().optional(),
  nodeId: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  modelName: z.string(),
  mcpTools: z.array(z.string()),
  codeTools: z.array(z.string()),
  handOffs: z.array(z.string()),
  memory: z.record(z.string(), z.string()).nullable().optional(),
  // ... additional fields
})

export const WorkflowConfigSchema = z.object({
  __schema_version: z.number().optional(),
  nodes: z.array(WorkflowNodeConfigSchema),
  entryNodeId: z.string(),
  contextFile: z.string().nullable().optional(),
  memory: z.record(z.string(), z.string()).nullable().optional(),
  toolsInformation: z.any().optional(),
  inputSchema: JsonSchemaZ.optional(),
  outputSchema: JsonSchemaZ.optional(),
  ui: WorkflowUISchema.optional(),
})

export type WorkflowNodeConfig = z.infer<typeof WorkflowNodeConfigSchema>
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>
export type JsonSchemaDefinition = JSONSchema7
```

---

## Invocation Plumbing & Types

### Evaluation Input (`packages/shared/src/contracts/ingestion.ts`)

```typescript
// Main discriminated union of all evaluation input types
export const EvaluationInputSchema = z.discriminatedUnion("type", [
  EvaluationTextSchema,
  EvaluationCSVSchema,
  PromptOnlySchema,
  MCPInvokeInputSchema,
  SWEBenchInputSchema,
  GAIAInputSchema,
  WebArenaInputSchema,
  DatasetRecordInputSchema,
])

export type EvaluationInput = z.infer<typeof EvaluationInputSchema>

// MCP JSON-RPC invocation input (primary use case)
export const MCPInvokeInputSchema = MainGoalSchema.extend({
  type: z.literal("mcp-invoke"),
  inputData: z.unknown(),
  inputSchema: OutputSchemaSchema.optional(),
  outputSchema: OutputSchemaSchema.optional(),
})

// Prompt-only input (no ground-truth evaluation)
export const PromptOnlySchema = MainGoalSchema.extend({
  type: z.literal("prompt-only"),
  outputSchema: z.never().optional(),
})
```

### Workflow Event Handler (`packages/shared/src/contracts/workflow-progress.ts`)

```typescript
export const WORKFLOW_PROGRESS_SCHEMA_VERSION = 1

export const workflowProgressEventSchema = z.discriminatedUnion("type", [
  workflowCancellingEvent,
  workflowCancelledEvent,
  nodeStartedEvent,
  nodeCompletedEvent,
  workflowStartedEvent,
  workflowCompletedEvent,
  workflowFailedEvent,
])

export type WorkflowProgressEvent = z.infer<typeof workflowProgressEventSchema>

/**
 * Type for workflow event handler callbacks
 */
export type WorkflowEventHandler = (event: WorkflowProgressEvent) => void | Promise<void>
```

### Invocation Input (`packages/core/src/workflow/runner/types.ts`)

```typescript
/**
 * Workflow validation method before execution
 */
export type ValidationMethod = "strict" | "ai" | "none"

/**
 * Union of supported ways to invoke a workflow
 */
export type InvocationInput = {
  evalInput: EvaluationInput
  onProgress?: WorkflowEventHandler
  abortSignal?: AbortSignal
  validation?: ValidationMethod
} & (
  | { workflowVersionId: string; filename?: never; dslConfig?: never }
  | { filename: string; workflowVersionId?: never; dslConfig?: never }
  | { dslConfig: WorkflowConfig; workflowVersionId?: never; filename?: never }
)

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
```

---

## Auth & Secrets

### Principal (`apps/web/src/lib/auth/principal.ts`)

```typescript
export type Principal = {
  clerk_id: string
  scopes: string[]
  auth_method: "api_key" | "session"
}

/**
 * Authenticates request via Bearer token or Clerk session
 */
export async function authenticateRequest(
  req: Request
): Promise<Principal | null>
```

### Secret Resolver (`apps/web/src/features/secret-management/lib/secretResolver.ts`)

```typescript
/**
 * Create context-aware secret resolver
 * - If principal provided, uses context-aware Supabase client
 * - If omitted, falls back to RLS client
 */
export function createSecretResolver(
  clerk_id: string,
  principal?: Principal
): SecretResolver

// Type from @lucky/shared/contracts/ingestion
export type SecretResolver = {
  get(secretKeyName: string, namespace?: string): Promise<string | undefined>
  getAll(secretKeyNames: string[], namespace?: string): Promise<Record<string, string>>
}
```

---

## Provider/Model Setup

### Path 1: Current Route (`/api/workflow/invoke`)

#### Load User Providers (`apps/web/src/features/provider-llm-setup/lib/load-user-providers.ts`)

```typescript
export type UserProviders = Record<LuckyProvider, string>

/**
 * Load API keys for all available providers
 * Only returns providers with valid keys
 */
export async function loadProviderApiKeys(
  secrets: SecretResolver
): Promise<Record<LuckyProvider, string>>
```

#### Get User Models Setup (`apps/web/src/features/provider-llm-setup/lib/user-models-get.ts`)

```typescript
/**
 * Fetch user's available models from the database
 * Converts enabled model IDs to full ModelEntry objects
 */
export async function getUserModelsSetup(
  auth: { clerkId: string } | { principal: Principal },
  onlyIncludeProviders?: LuckyProvider[]
): Promise<ModelEntry[]>
```

#### UserModels (`packages/models/src/user-models.ts`)

```typescript
export class UserModels {
  constructor(
    userId: string,
    mode: "byok" | "shared",
    allowedModels: string[],
    apiKeys: FallbackKeys,
    fallbackKeys: FallbackKeys
  )

  /**
   * Get a model by name
   * Supports 3 formats:
   * 1. "openai#gpt-4o" - with provider prefix
   * 2. "gpt-4o" - auto-detect provider
   * 3. Model must be in user's allowed list
   */
  model(name: string, options?: ProviderOptions): LanguageModel

  /**
   * Select model by tier (cheap/fast/smart/balanced)
   */
  tier(tierName: TierName, options?: ProviderOptions): LanguageModel

  /**
   * Resolve tier name or model name to LanguageModel or catalog ID string
   */
  resolve(nameOrTier: string, options?: {...}): LanguageModel | string

  getCatalog(): ModelEntry[]
}
```

### Path 2: v1 Route (`/api/v1/invoke`)

#### Create LLM Registry (`apps/web/src/features/provider-llm-setup/lib/create-llm-registry.ts`)

```typescript
export async function createLLMRegistryForUser({
  principal,
  userProviders,
  userEnabledModels,
  fallbackKeys,
}: {
  principal: Principal
  userProviders: UserProviders
  userEnabledModels: ModelEntry[]
  fallbackKeys?: Record<string, string>
}): Promise<UserModels>
```

### Provider Validation (`apps/web/src/features/workflow-or-chat-invocation/lib/validation/provider-validation.ts`)

```typescript
/**
 * Extract required provider API keys from workflow config
 */
export function getRequiredProviderKeys(
  config: WorkflowConfig,
  context: string
): RequiredProviders

/**
 * Validate that all required provider keys are present
 */
export function validateProviderKeys(
  requiredKeys: string[],
  apiKeys: Record<string, string | undefined>
): string[]

/**
 * Convert array of missing API key names to user-friendly provider display names
 */
export function formatMissingProviders(missingKeys: string[]): string[]

// From @lucky/core/workflow/provider-extraction
export type RequiredProviders = {
  providers: Set<string>
  models: Map<string, string[]>
}
```

### Model Types (`packages/models/src/types.ts`)

```typescript
export interface FallbackKeys {
  [provider: string]: string | undefined
}

export interface UserConfig {
  mode: "byok" | "shared"
  userId: string
  models: string[]
  apiKeys?: Partial<Record<LuckyProvider, string>>
}
```

---

## MCP & Transforms

### MCP Toolkit Loader (`apps/web/src/features/workflow-or-chat-invocation/lib/tools/mcp-toolkit-loader.ts`)

```typescript
/**
 * Load MCP toolkits for workflow execution from database
 * Only loads for session-authenticated users in non-production
 */
export async function loadMCPToolkitsForWorkflow(
  principal: Principal
): Promise<MCPToolkitMap | undefined>
```

### JSON-RPC Request/Response Types (`packages/shared/src/contracts/invoke.ts`)

```typescript
export const JsonRpcId = z.union([
  z.string().min(1),
  z.number().int().refine(Number.isSafeInteger, "id must be a safe integer"),
])

export const InvokeOptions = z.object({
  goal: z.string().max(2000).optional(),
  timeoutMs: z.number().int().positive().max(10 * 60 * 1000).optional(),
  trace: z.boolean().optional(),
  idempotencyKey: z.string().min(8).max(256).optional(),
}).strict()

export const jsonRpcInvokeRequestSchema = <T extends z.ZodTypeAny>(paramsSchema: T) =>
  z.object({
    jsonrpc: z.literal("2.0"),
    id: JsonRpcId,
    method: z.literal("workflow.invoke"),
    params: paramsSchema,
  }).strict()

export const JsonRpcInvokeSuccess = z.object({
  jsonrpc: z.literal("2.0"),
  id: JsonRpcId,
  result: z.object({
    status: z.literal("ok"),
    output: z.unknown(),
    meta: z.object({
      requestId: z.string().min(1).optional(),
      workflow_id: z.string().min(1).optional(),
      startedAt: z.string().datetime().optional(),
      finishedAt: z.string().datetime().optional(),
      traceId: z.string().min(1).optional(),
      invocationType: z.enum(["http", "mcp"]).optional(),
    }).strict().optional(),
  }).strict(),
}).strict()

export const JsonRpcInvokeError = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([JsonRpcId, z.null()]),
  error: z.object({
    code: z.number().int(),
    message: z.string().min(1),
    data: z.unknown().optional(),
  }).strict(),
}).strict()

export const JsonRpcInvokeResponse = z.union([
  JsonRpcInvokeSuccess,
  JsonRpcInvokeError
])

export type InvokeResponse = z.infer<typeof JsonRpcInvokeResponse>

export const ErrorCodes = {
  // Standard JSON-RPC 2.0 errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,

  // Application-specific errors
  INVALID_AUTH: -32000,
  WORKFLOW_NOT_FOUND: -32001,
  INPUT_VALIDATION_FAILED: -32002,
  WORKFLOW_EXECUTION_FAILED: -32003,
  TIMEOUT: -32004,
  IDEMPOTENCY_CONFLICT: -32005,
  MISSING_API_KEYS: -32006,
} as const

export function extractBearerToken(
  headers: Record<string, string | string[] | undefined>,
  bodyAuth?: { bearer?: string }
): string

export function pickIdempotencyKey(
  headers: Record<string, string | string[] | undefined>,
  optionsKey?: string
): string | undefined
```

### Transform Helpers (Referenced in v1 route)

**Note:** The v1 route references these helpers with `*` markers (shown in the route file above):
- `validateInvokeRequest*` - Validates JSON-RPC request structure
- `formatErrorResponse*` - Formats JSON-RPC error responses
- `transformInvokeInput*` - Transforms JSON-RPC request to internal format
- `createInvocationInput*` - Creates InvocationInput from transformed data
- `formatSuccessResponse*` - Formats JSON-RPC success responses
- `formatWorkflowError*` - Formats workflow execution errors
- `formatInternalError` - Formats internal server errors
- `extractWorkflowOutput*` - Extracts output from workflow result
- `extractTraceId*` - Extracts trace ID from workflow result

These are typically implemented in a response formatter module that would need to be located in the codebase.

---

## Runner & Result Typing

### Invoke Workflow (`packages/core/src/workflow/runner/invokeWorkflow.ts`)

```typescript
/**
 * Main entry point for workflow execution
 * Returns RunResult[] (array of results for each WorkflowIO case)
 */
export async function invokeWorkflow(
  input: InvocationInput
): Promise<RS<RunResult[]>>
```

### Workflow Class (`packages/core/src/workflow/Workflow.ts`)

```typescript
export class Workflow {
  static create({
    config,
    evaluationInput,
    parent1Id,
    parent2Id,
    evolutionContext,
    toolContext,
    workflowVersionId,
    persistence,
  }: {...}): Workflow

  async prepareWorkflow(
    evaluationInput: EvaluationInput,
    problemAnalysisMethod: PrepareProblemMethod
  ): Promise<void>

  async run(options?: {
    onProgress?: WorkflowEventHandler
    abortSignal?: AbortSignal
  }): Promise<RS<RunResult[]>>

  async evaluate(): Promise<RS<AggregateEvaluationResult>>

  getConfig(): WorkflowConfig
  getWorkflowVersionId(): string
  getWorkflowInvocationId(index?: number): string
  // ... many other methods
}
```

---

## Observation

### Observation Context (`packages/core/src/context/observationContext.ts`)

```typescript
export const ZObservationSchema = z.object({
  randomId: z.string(),
  observer: z.custom<AgentObserver>(),
})

export type ObservationSchema = z.infer<typeof ZObservationSchema>

export function withObservationContext<T>(
  values: ObservationSchema,
  fn: () => Promise<T>
): Promise<T>

export function getObservationContext(): RuntimeContext<ObservationSchema> | undefined

export function requireObservationContext(): RuntimeContext<ObservationSchema>
```

### Agent Observer (`packages/core/src/utils/observability/AgentObserver.ts`)

```typescript
export class AgentObserver {
  constructor()

  // Event methods
  onWorkflowStarted(event: WorkflowStartedEvent): void
  onWorkflowCompleted(event: WorkflowCompletedEvent): void
  onWorkflowFailed(event: WorkflowFailedEvent): void
  onNodeStarted(event: NodeStartedEvent): void
  onNodeCompleted(event: NodeCompletedEvent): void
  onWorkflowCancelling(event: WorkflowCancellingEvent): void
  onWorkflowCancelled(event: WorkflowCancelledEvent): void

  // Stream access
  getEventStream(): ReadableStream<WorkflowProgressEvent>
  dispose(): void
}
```

### Observer Registry (`packages/core/src/utils/observability/ObserverRegistry.ts`)

```typescript
export class ObserverRegistry {
  private static instance: ObserverRegistry

  static getInstance(): ObserverRegistry

  register(id: string, observer: AgentObserver): void
  get(id: string): AgentObserver | undefined
  dispose(id: string): void
  disposeAll(): void
}
```

---

## Misc Infra

### Execution Context (`packages/core/src/context/executionContext.ts`)

```typescript
export const ZExecutionSchema = z.object({
  principal: ZPrincipal,
  secrets: z.custom<SecretResolver>(),
  apiKeys: z.record(z.string()).optional(),
  userModels: z.custom<UserModels>().optional(),
  spendingTracker: z.custom<SpendingTracker>().optional(),
  mcp: executionMCPContextSchema.optional(),
})

export type ExecutionSchema = z.infer<typeof ZExecutionSchema>

export function withExecutionContext<T>(
  values: ExecutionSchema,
  fn: () => Promise<T>
): Promise<T>

export function getExecutionContext(): RuntimeContext<ExecutionSchema> | undefined
export function requireExecutionContext(): RuntimeContext<ExecutionSchema>
export async function getApiKey(name: string): Promise<string | undefined>
export function getUserModelsFromContext(): UserModels
```

### Ensure Core Init (`apps/web/src/lib/ensure-core-init.ts`)

```typescript
/**
 * Ensures core package is initialized before workflow execution
 */
export function ensureCoreInit(): void
```

### Workflow Cancel Contract (`apps/web/src/app/api/workflow/cancel/[invocationId]/route.ts`)

```typescript
/**
 * POST /api/workflow/cancel/[invocationId]
 *
 * Gracefully cancels a running workflow by triggering its AbortController
 * Returns 202 Accepted with state: "cancelling" | "already_completed" | "already_cancelled" | "not_found"
 *
 * The requestId from /api/workflow/invoke is used as the invocationId cancellation token
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invocationId: string }> }
): Promise<NextResponse>
```

### Active Workflows (`apps/web/src/features/workflow-or-chat-invocation/workflow/active-workflows.ts`)

```typescript
/**
 * In-memory map of active workflow invocations
 * Used for cancellation support
 */
export const activeWorkflows = new Map<string, {
  controller: AbortController
  createdAt: number
  state: "running" | "cancelling" | "cancelled"
  cancelRequestedAt?: number
}>()
```

### Error Types

#### User Error (`apps/web/src/features/workflow-or-chat-invocation/lib/errors/userError.ts`)

```typescript
export function getUserFriendlyError(error: unknown): string
```

#### Workflow Input Error (`apps/web/src/features/workflow-or-chat-invocation/lib/errors/workflowInputError.ts`)

```typescript
export class InvalidWorkflowInputError extends Error {
  constructor(
    public readonly code: number,
    public readonly message: string
  )
}
```

---

## Usage Examples

### Example 1: Full Flow in `/api/workflow/invoke`

```typescript
// 1. Parse request
const parsed = await handleBody("workflow/invoke", req)
if (isHandleBodyError(parsed)) return parsed

// 2. Convert to InvocationInput
const input: InvocationInput = {
  workflowVersionId: parsed.workflowVersionId,
  evalInput: parsed.evalInput,
}

// 3. Authenticate
const principal = await authenticateRequest(req)
if (!principal) return fail("workflow/invoke", "Auth required", { status: 401 })

// 4. Validate input
validateWorkflowInput(principal)

// 5. Setup secrets and providers
const secrets = createSecretResolver(principal.clerk_id, principal)
const providerApiKeys = await loadProviderApiKeys(secrets)
const models = await getUserModelsSetup({ principal }, Object.keys(providerApiKeys))
const userModels = new UserModels(principal.clerk_id, "byok", models.map(m => m.id), {...}, {})

// 6. Setup MCP
const mcpToolkits = await loadMCPToolkitsForWorkflow(principal)

// 7. Create observer
const observer = new AgentObserver()
const registry = ObserverRegistry.getInstance()
registry.register(randomId, observer)

// 8. Execute
const result = await withExecutionContext(
  { principal, secrets, apiKeys: providerApiKeys, userModels, mcp: { toolkits: mcpToolkits } },
  async () => {
    return withObservationContext({ randomId, observer }, async () => {
      return invokeWorkflow({ ...input, abortSignal: controller.signal })
    })
  }
)

// 9. Return response
if (!result.success) return fail("workflow/invoke", result.error, { status: 500 })
return alrighty("workflow/invoke", {
  success: true,
  data: {
    output: result,
    invocationId: requestId,
    traceId: result.data?.[0]?.workflowInvocationId || requestId,
  },
})
```

### Example 2: JSON-RPC Flow in `/api/v1/invoke`

```typescript
// 1. Parse and validate JSON-RPC request
const body = await req.json()
const validationResult = validateInvokeRequest(body)
if (!validationResult.success) {
  return NextResponse.json(formatErrorResponse(body.id ?? null, validationResult.error), { status: 400 })
}

// 2. Load workflow config
const workflowLoadResult = await loadWorkflowConfig(rpcRequest.params.workflowVersionId, principal)
if (!workflowLoadResult.success) {
  return NextResponse.json(formatErrorResponse(rpcRequest.id, workflowLoadResult.error), { status: 404 })
}

// 3. Validate input schema
if (rpcRequest.params.evalInput.type === "mcp-invoke") {
  validateWorkflowInputSchema(rpcRequest.params.evalInput.inputData, workflowLoadResult.inputSchema)
}

// 4. Transform and execute
const transformed = transformInvokeInput(rpcRequest)
const invocationInput = createInvocationInput(transformed)

// 5. Setup context and invoke
const secrets = createSecretResolver(principal.clerk_id, principal)
const apiKeys = await secrets.getAll(Array.from(providers), "environment-variables")
const llmRegistry = createLLMRegistry({ fallbackKeys: {...} })
const userModels = llmRegistry.forUser({ mode: "byok", userId: principal.clerk_id, models: [...], apiKeys })

const result = await withExecutionContext({ principal, secrets, apiKeys, userModels }, async () => {
  return invokeWorkflow(coreInvocationInput)
})

// 6. Format and return JSON-RPC response
const output = extractWorkflowOutput(result)
const traceId = extractTraceId(result)
return NextResponse.json(
  formatSuccessResponse(rpcRequest.id, output, {
    requestId: transformed.workflowId,
    workflowId: workflowLoadResult.resolvedWorkflowVersionId,
    startedAt,
    finishedAt,
    traceId,
  }),
  { status: 200 }
)
```

---

## Database Tables (Relevant to Workflows)

### Workflows
- `app.workflows` - Parent workflow definitions
- `app.workflow_versions` - Versioned workflow configurations (DSL stored here)
- `app.workflow_invocations` - Individual workflow execution records

### Provider Keys
- `lockbox.user_secrets` - Encrypted API keys (provider secrets)
- `app.provider_settings` - User's enabled providers and models

### Model Entitlements
- `app.provider_settings.enabled_models` - User's enabled model IDs per provider

---

## Key Takeaways

1. **Two Routes:**
   - `/api/workflow/invoke` - Internal REST endpoint, uses `handleBody` + `alrighty`/`fail`
   - `/api/v1/invoke` - JSON-RPC 2.0 endpoint, uses manual JSON-RPC validation and formatting

2. **Workflow Loading:**
   - Supports `wf_*` (parent, resolves to latest) and `wf_ver_*` (specific version)
   - Demo workflow (`wf_demo`) for onboarding
   - Principal-based access control (RLS or service role)

3. **Model Resolution:**
   - Current route: `loadProviderApiKeys` → `getUserModelsSetup` → `new UserModels()`
   - v1 route: `createLLMRegistry` → `llmRegistry.forUser()` → `UserModels`
   - Models identified by catalog ID: `provider#model` (e.g., `openai#gpt-4o`)

4. **Security:**
   - Session auth (UI) cannot load from files, must use database workflows
   - API key auth (dev/testing) can load from files or database
   - Provider keys validated before execution for session auth

5. **Execution Context:**
   - `withExecutionContext` provides: principal, secrets, apiKeys, userModels, mcp
   - `withObservationContext` provides: observer for real-time events
   - Both use AsyncLocalStorage for scope-based access

6. **Cancellation:**
   - Uses `AbortController` + `AbortSignal`
   - Stored in `activeWorkflows` map + Redis
   - Cancel endpoint: `POST /api/workflow/cancel/[invocationId]`
   - Returns 202 with state: cancelling/cancelled/not_found

7. **Events:**
   - `WorkflowEventHandler` receives `WorkflowProgressEvent` (node started/completed, workflow started/completed/failed/cancelling/cancelled)
   - `AgentObserver` provides `ReadableStream<WorkflowProgressEvent>` for SSE
   - `ObserverRegistry` manages observer lifecycle with TTL auto-cleanup

---

**End of Source of Truth Document**
