# Workflow Execution State Chart & Error Matrix

**Last Updated:** 2025-10-13

## Table of Contents

- [Overview](#overview)
- [How to Use This Document](#how-to-use-this-document)
- [Table 1: State Transitions](#table-1-state-transitions)
- [Table 2: Error State Matrix](#table-2-error-state-matrix)
- [Table 3: Component Interaction Map](#table-3-component-interaction-map)
- [Key Execution Paths](#key-execution-paths)
- [State Definitions](#state-definitions)
- [Maintenance Guide](#maintenance-guide)

## Overview

This document provides a comprehensive map of workflow execution behavior - every state transition, every error condition, and every component interaction. It serves as the single source of truth for understanding:

- **What happens when**: Complete execution flow from "User clicks Run" to completion
- **What can go wrong**: Every error state, its origin, and recovery path
- **Who talks to who**: Component dependencies and interaction patterns

**Think of this as a complete map of the system's behavior - in table format, not diagrams.**

## How to Use This Document

### For Debugging
"User hit error X" → Look up in [Table 2](#table-2-error-state-matrix) → See which component, why, how to fix

### For Development
- "Adding new feature" → Check [Table 1](#table-1-state-transitions) → See where it fits in state flow
- "Handling new error" → Add row to [Table 2](#table-2-error-state-matrix) → Everyone knows it exists

### For Onboarding
New engineer: "How does workflow execution work?" → Point them to this file → Complete understanding in 30 minutes

### For Product
- "What errors can users hit?" → [Table 2](#table-2-error-state-matrix) has every single one
- "Where should we improve error messages?" → Scan "User Sees" column

---

## Table 1: State Transitions

Complete state machine for workflow execution from user action to completion/failure.

| Current State | Trigger | Next State | Component | File Path | Can Fail? | Failure State | Notes |
|--------------|---------|------------|-----------|-----------|-----------|---------------|-------|
| **idle** | User clicks "Run" (UI) | **authenticating** | Next.js Route Handler | `apps/web/src/app/api/workflow/invoke/route.ts:31` | Yes | `authentication_failed` | Entry point from web UI |
| **authenticating** | Auth token validated | **extracting_providers** | authenticateRequest | `apps/web/src/lib/auth/principal.ts` | Yes | `authentication_failed` | Clerk auth for session users, API key for programmatic |
| **extracting_providers** | Parse workflow config | **validating_provider_keys** | extractRequiredProviders | `packages/core/src/workflow/provider-extraction.ts:16` | Yes | `provider_extraction_failed` | Determines which API keys are needed |
| **validating_provider_keys** | Check lockbox/env | **validating_workflow** | validateProviderKeys | `apps/web/src/lib/workflow/provider-validation.ts` | Yes | `missing_api_keys` | Only for session auth; API key auth skips |
| **validating_workflow** | Load workflow DSL | **migrating_schema** | WorkflowConfigHandler | `packages/core/src/workflow/setup/WorkflowLoader.ts:194` | Yes | `workflow_load_failed` | Loads from DB, file, or DSL |
| **migrating_schema** | Schema version check | **verifying_workflow** | migrateWorkflowConfig | `packages/core/src/workflow/setup/WorkflowLoader.ts:22` | No | - | Upgrades old workflows to current schema |
| **verifying_workflow** | Zod + custom validation | **initializing_spending** | verifyWorkflowConfigStrict | `packages/core/src/utils/validation/workflow/verifyWorkflow.ts:132` | Yes | `validation_failed` | Comprehensive validation suite |
| **initializing_spending** | Check spending limits | **creating_workflow** | SpendingTracker.initialize | `packages/core/src/utils/spending/SpendingTracker.ts` | Yes | `spending_limit_exceeded` | Only if limits enabled in config |
| **creating_workflow** | Instantiate Workflow | **preparing_workflow** | Workflow.create | `packages/core/src/workflow/Workflow.ts` | No | - | Creates workflow instance with config |
| **preparing_workflow** | Process eval input | **initializing_nodes** | workflow.prepareWorkflow | `packages/core/src/workflow/Workflow.ts` | Yes | `preparation_failed` | Sets up context, memory, ingestion |
| **initializing_nodes** | Create WorkFlowNode for each node | **registering_nodes** | WorkFlowNode.create | `packages/core/src/node/WorkFlowNode.ts:93` | Yes | `initialization_failed` | Async tool initialization |
| **registering_nodes** | Register in database | **workflow_executing** | NodePersistenceManager.registerNode | `packages/core/src/utils/persistence/node/nodePersistence.ts` | Yes | `persistence_failed` | Skipped if mock persistence |
| **workflow_executing** | Start execution | **node_ready** | workflow.run | `packages/core/src/workflow/Workflow.ts` | Yes | `execution_failed` | Entry point for DAG traversal |
| **node_ready** | Select entry node | **building_context** | Workflow queue logic | `packages/core/src/workflow/Workflow.ts` | No | - | Identifies starting node |
| **building_context** | Prepare messages | **resolving_model** | node.invoke | `packages/core/src/node/WorkFlowNode.ts:172` | Yes | `context_preparation_failed` | Creates NodeInvocationCallContext |
| **resolving_model** | Look up model in catalog | **initializing_pipeline** | findModelByName | `packages/models/src/pricing/model-lookup.ts` | Yes | `model_not_found` | CRITICAL: Uses MODEL_CATALOG as source of truth |
| **initializing_pipeline** | Create InvocationPipeline | **pipeline_prepared** | InvocationPipeline constructor | `packages/core/src/messages/pipeline/InvocationPipeline.ts:103` | No | - | State machine starts in CREATED |
| **pipeline_prepared** | Initialize tools + messages | **checking_guards** | pipeline.prepare | `packages/core/src/messages/pipeline/InvocationPipeline.ts:128` | Yes | `tool_initialization_failed` | State: CREATED → PREPARED |
| **checking_guards** | Rate limit + spending checks | **invoking_model** | sendAI guards | `packages/core/src/messages/api/sendAI/sendAI.ts` | Yes | `rate_limit_exceeded` or `spending_limit_exceeded` | Pre-flight checks before model call |
| **invoking_model** | Call AI provider | **processing_response** | sendAI | `packages/core/src/messages/api/sendAI/sendAI.ts` | Yes | `model_error` | Vercel AI SDK: generateText/streamText |
| **processing_response** | Parse model response | **handling_steps** | processResponseVercel | `packages/core/src/messages/api/processResponse.ts` | Yes | `response_format_error` | Handles text, tools, errors |
| **handling_steps** | Check for tool calls | **executing_tools** or **finalizing_node** | Pipeline loop logic | `packages/core/src/messages/pipeline/InvocationPipeline.ts` | Yes | `tool_execution_failed` | Multi-step if tools, else finalize |
| **executing_tools** | Run tool functions | **processing_tool_results** | Tool execution (MCP or code) | `packages/core/src/node/toolManager.ts` | Yes | `tool_execution_failed` | V3 strategy: parallel execution |
| **processing_tool_results** | Accumulate results | **invoking_model** (loop) or **finalizing_node** | Multi-step loop | `packages/core/src/messages/pipeline/agentStepLoop/` | Yes | `max_rounds_exceeded` | Continues until text response or max rounds |
| **finalizing_node** | Create summary + extract memory | **coordinating_handoff** | pipeline.process | `packages/core/src/messages/pipeline/InvocationPipeline.ts` | Yes | `processing_failed` | State: EXECUTED → PROCESSING → COMPLETED |
| **coordinating_handoff** | Determine next node(s) | **node_ready** (next) or **evaluating** | Workflow handoff logic | `packages/core/src/workflow/Workflow.ts` | Yes | `coordination_failed` | Dynamic routing or fixed handoffs |
| **evaluating** | Calculate fitness | **persisting_results** | workflow.evaluate | `packages/core/src/evaluation/evaluators/WorkflowEvaluator.ts` | Yes | `evaluation_failed` | Only if evalInput has answer/expectedOutput |
| **persisting_results** | Save to database | **workflow_complete** | Persistence layer | `packages/adapter-supabase/src/workflows/workflow-persistence.ts` | Yes | `persistence_failed` | Skipped if mock persistence |
| **workflow_complete** | Return results | **idle** | API response | `apps/web/src/app/api/workflow/invoke/route.ts:112` | No | - | Success path ends here |

### Abort/Cancel Path

| Current State | Trigger | Next State | Component | File Path | Notes |
|--------------|---------|------------|-----------|-----------|-------|
| **workflow_executing** | User clicks "Cancel" | **cancelling** | /api/workflow/cancel | `apps/web/src/app/api/workflow/cancel/route.ts` | Publishes to Redis |
| **cancelling** | AbortController.abort() | **workflow_cancelled** | activeWorkflows | `apps/web/src/lib/workflow/active-workflows.ts` | Triggers abortSignal |
| **workflow_cancelled** | Cleanup resources | **idle** | Workflow cleanup | Various | Deletes from Redis + activeWorkflows map |

---

## Table 2: Error State Matrix

Every error that can occur during workflow execution, organized by state and component.

| Error State | Error Code | Origin Component | File Path | User Sees | Technical Reason | Recovery Path | Logs Location |
|-------------|-----------|------------------|-----------|-----------|------------------|---------------|---------------|
| **authentication_failed** | INVALID_AUTH | authenticateRequest | `apps/web/src/lib/auth/principal.ts` | "Authentication required" | No valid session or API key | Log in or provide valid API key | Console + error-logger.ts |
| **provider_extraction_failed** | WORKFLOW_CONFIG_ERROR | extractRequiredProviders | `packages/core/src/workflow/provider-extraction.ts:16` | "Cannot determine required providers" | Workflow has invalid model names | Check workflow config, ensure models exist in catalog | Console warning |
| **missing_api_keys** | MISSING_API_KEYS | validateProviderKeys | `apps/web/src/lib/workflow/provider-validation.ts` | "This workflow requires [Provider] API key(s) to run. Please configure in Settings → Providers." | Required API keys not in lockbox | Go to /settings/providers, add keys | Console error |
| **workflow_load_failed** | WORKFLOW_CONFIG_ERROR | WorkflowConfigHandler | `packages/core/src/workflow/setup/WorkflowLoader.ts` | "Failed to load workflow" | File not found, invalid JSON, or DB error | Check file path, JSON syntax, or DB connection | WorkflowConfigError thrown |
| **validation_failed** | WORKFLOW_VALIDATION_ERROR | verifyWorkflowConfig | `packages/core/src/utils/validation/workflow/verifyWorkflow.ts:70` | "Workflow configuration is invalid: [specific errors]" | Zod schema mismatch, invalid connections, bad tool refs, cycles detected | Fix workflow JSON per error messages | Console errors list |
| **model_not_found** | WORKFLOW_CONFIG_ERROR | findModelByName | `packages/models/src/pricing/model-lookup.ts` | "Model '[name]' not found in catalog" | Model name not in MODEL_CATALOG | Use valid model name from catalog or update catalog | Console error + thrown error |
| **provider_routing_failed** | WORKFLOW_CONFIG_ERROR | models.resolveSpec | `packages/models/src/models.ts:95` | "Cannot resolve model spec: [spec]" | Model lookup failed + no default tier | Add model to catalog or configure default tier | Thrown error |
| **spending_limit_exceeded** | SPENDING_LIMIT_ERROR | SpendingTracker guards | `packages/core/src/utils/spending/SpendingTracker.ts` | "Budget exceeded: $[amount] of $[limit] used" | SpendingTracker.canMakeRequest() = false | Increase budget in config or wait for reset | SpendingTracker logs |
| **rate_limit_exceeded** | RATE_LIMIT_ERROR | sendAI rate limit guard | `packages/core/src/messages/api/sendAI/guards.ts` | "Too many requests: [count] in [window]" | hitTimestamps > limit (e.g., 60/min) | Wait for rate limit window or increase limit | guards.ts logs |
| **initialization_failed** | NODE_EXECUTION_ERROR | WorkFlowNode.create | `packages/core/src/node/WorkFlowNode.ts:93` | "Failed to initialize node [nodeId]" | Tool initialization error (MCP connection, etc.) | Check tool configs, MCP server status | Thrown NodeExecutionError |
| **tool_initialization_failed** | TOOL_EXECUTION_ERROR | ToolManager.initializeTools | `packages/core/src/node/toolManager.ts` | "Failed to initialize tools for node [nodeId]" | MCP connection failed or code tool load error | Check MCP server, verify tool definitions | Console error |
| **context_preparation_failed** | NODE_INVOCATION_ERROR | prepareIncomingMessage | `packages/core/src/messages/pipeline/prepare/incomingMessage.ts` | "Failed to prepare node context" | Invalid message format or missing required fields | Check message contracts, validate payload | Thrown error |
| **model_error** | MODEL_ERROR | sendAI | `packages/core/src/messages/api/sendAI/sendAI.ts` | "Model request failed: [provider error]" | API error from provider (auth, quota, server error) | Check API key, provider status, request params | processResponse error handling |
| **model_timeout** | TIMEOUT_ERROR | sendAI with timeout | `packages/core/src/messages/api/sendAI/sendAI.ts` | "Model didn't respond in time" | Request exceeded timeout (default 30s) | Use faster model or increase timeout | Timeout error logged |
| **response_format_error** | RESPONSE_ERROR | processResponseVercel | `packages/core/src/messages/api/processResponse.ts` | "Invalid model response format" | Response doesn't match expected schema | Check model capabilities, verify prompt | ProcessedResponse error |
| **tool_execution_failed** | TOOL_EXECUTION_ERROR | Tool execution | `packages/core/src/node/toolManager.ts` | "Tool '[name]' failed: [error]" | Tool threw exception during execution | Check tool implementation, validate parameters | ToolExecutionError thrown |
| **max_rounds_exceeded** | NODE_EXECUTION_ERROR | Multi-step loop | `packages/core/src/messages/pipeline/agentStepLoop/` | "Maximum tool execution rounds exceeded" | Agent didn't converge after max rounds (config: experimentalMultiStepLoopMaxRounds) | Increase max rounds or simplify task | Loop completion logs |
| **processing_failed** | NODE_INVOCATION_ERROR | pipeline.process | `packages/core/src/messages/pipeline/InvocationPipeline.ts` | "Failed to process node response" | Summary creation or memory extraction failed | Check response structure, memory format | Thrown error |
| **coordination_failed** | WORKFLOW_EXECUTION_ERROR | Workflow handoff logic | `packages/core/src/workflow/Workflow.ts` | "Failed to coordinate handoff from [nodeId]" | Invalid handoff targets or routing logic error | Check handOffs array, validate node IDs | Console error |
| **evaluation_failed** | EVALUATION_ERROR | WorkflowEvaluator | `packages/core/src/evaluation/evaluators/WorkflowEvaluator.ts` | "Failed to evaluate workflow results" | Evaluator threw error or invalid fitness calculation | Check eval config, validate answer format | EvaluationError thrown |
| **persistence_failed** | WORKFLOW_PERSISTENCE_ERROR | Persistence layer | `packages/adapter-supabase/src/` | "Failed to save workflow results" | Database connection error or invalid data | Check DB connection, validate data schema | Thrown persistence error |
| **state_management_error** | STATE_MANAGEMENT_ERROR | InvocationPipeline state machine | `packages/core/src/messages/pipeline/InvocationPipeline.ts:129` | "Internal state error" | Method called in wrong pipeline state | This is a bug - report with stack trace | StateManagementError thrown |
| **race_condition_error** | RACE_CONDITION_ERROR | Pipeline execution | `packages/core/src/messages/pipeline/InvocationPipeline.ts` | "Race condition detected" | Concurrent state modifications | This is a bug - report with stack trace | RaceConditionError thrown |
| **browser_environment_error** | BROWSER_ENVIRONMENT_ERROR | WorkflowConfigHandler | `packages/core/src/workflow/setup/WorkflowLoader.ts:96` | "Cannot perform '[operation]' in browser. Use API routes." | Browser tried to access filesystem | Use API endpoints instead of direct imports | BrowserEnvironmentError thrown |
| **workflow_cancelled** | CANCELLED | Abort controller | `apps/web/src/lib/workflow/active-workflows.ts` | "Workflow execution cancelled" | User clicked cancel or timeout | Re-run workflow if needed | Redis + activeWorkflows |

### Error Code Categories

- **4xx Client Errors**: INVALID_AUTH, INVALID_REQUEST, MISSING_API_KEYS, WORKFLOW_CONFIG_ERROR
- **5xx Server Errors**: All other errors (system/runtime failures)

---

## Table 3: Component Interaction Map

Shows data flow and dependencies between major system components.

| Component | Calls | Called By | State Responsibilities | File Path | Error Types Thrown |
|-----------|-------|-----------|------------------------|-----------|-------------------|
| **Route Handler** | authenticateRequest, loadWorkflowConfig, invokeWorkflow | User (HTTP POST) | idle → authenticating → extracting_providers | `apps/web/src/app/api/workflow/invoke/route.ts` | API response errors (formatted) |
| **authenticateRequest** | Clerk SDK, Supabase | Route Handler | authenticating → extraction_providers (success) or authentication_failed | `apps/web/src/lib/auth/principal.ts` | Authentication errors |
| **extractRequiredProviders** | findModelByName | Route Handler | extracting_providers → validating_provider_keys | `packages/core/src/workflow/provider-extraction.ts` | None (returns empty set on error) |
| **validateProviderKeys** | SecretResolver | Route Handler | validating_provider_keys → validating_workflow or missing_api_keys | `apps/web/src/lib/workflow/provider-validation.ts` | None (returns missing keys list) |
| **WorkflowConfigHandler** | fs.readFile, JSON.parse, WorkflowConfigSchema.parse | invokeWorkflow (via loadFromX) | validating_workflow → migrating_schema → verifying_workflow | `packages/core/src/workflow/setup/WorkflowLoader.ts` | WorkflowConfigError, FileSystemError, JSONParseError, DatabaseError |
| **verifyWorkflowConfig** | All verification functions | WorkflowConfigHandler.loadFromDSL | verifying_workflow → initializing_spending or validation_failed | `packages/core/src/utils/validation/workflow/verifyWorkflow.ts` | Error (if throwOnError=true) |
| **findModelByName** | MODEL_CATALOG search | extractRequiredProviders, verifyWorkflow, models.resolveSpec | Model name → catalog entry lookup | `packages/models/src/pricing/model-lookup.ts` | None (returns undefined) |
| **SpendingTracker** | Internal state tracking | invokeWorkflow, sendAI guards | initializing_spending, checking_guards | `packages/core/src/utils/spending/SpendingTracker.ts` | Spending errors (via guard rejection) |
| **Workflow.create** | Node creation, tool setup | invokeWorkflow | creating_workflow | `packages/core/src/workflow/Workflow.ts` | WorkflowError types |
| **Workflow.prepareWorkflow** | IngestionLayer, context setup | invokeWorkflow | preparing_workflow | `packages/core/src/workflow/Workflow.ts` | WorkflowExecutionError |
| **Workflow.run** | Node queue management, node.invoke | invokeWorkflow | workflow_executing → evaluating or workflow_complete | `packages/core/src/workflow/Workflow.ts` | WorkflowExecutionError |
| **Workflow.evaluate** | WorkflowEvaluator | invokeWorkflow | evaluating → persisting_results | `packages/core/src/workflow/Workflow.ts` | EvaluationError |
| **WorkFlowNode.create** | ToolManager.initialize, NodePersistenceManager | Workflow node creation | initializing_nodes → registering_nodes | `packages/core/src/node/WorkFlowNode.ts` | NodeExecutionError |
| **WorkFlowNode.invoke** | InvocationPipeline.prepare/execute/process | Workflow.run | node_ready → building_context → ... → finalizing_node | `packages/core/src/node/WorkFlowNode.ts` | NodeInvocationError |
| **InvocationPipeline.prepare** | toolManager.initializeTools, prepareIncomingMessage | WorkFlowNode.invoke | pipeline_prepared → checking_guards | `packages/core/src/messages/pipeline/InvocationPipeline.ts` | StateManagementError, tool errors |
| **InvocationPipeline.execute** | sendAI, multi-step loop | WorkFlowNode.invoke | checking_guards → invoking_model → handling_steps | `packages/core/src/messages/pipeline/InvocationPipeline.ts` | StateManagementError, RaceConditionError |
| **InvocationPipeline.process** | createSummary, memory extraction | WorkFlowNode.invoke | finalizing_node | `packages/core/src/messages/pipeline/InvocationPipeline.ts` | Processing errors |
| **sendAI** | rateLimit, spendingGuard, getLanguageModel, generateText/streamText | InvocationPipeline.execute | checking_guards → invoking_model | `packages/core/src/messages/api/sendAI/sendAI.ts` | Rate limit, spending, model errors |
| **getLanguageModel** | models.resolveSpec, registry.getModel | sendAI | resolving_model | `packages/models/src/models.ts` | Model resolution errors |
| **models.resolveSpec** | findModelByName, tier resolution | getLanguageModel | resolving_model → initializing_pipeline | `packages/models/src/models.ts` | ModelNotFoundError |
| **processResponseVercel** | Response parsing, type checking | sendAI | processing_response | `packages/core/src/messages/api/processResponse.ts` | Response format errors |
| **ToolManager** | MCP client, code tool registry | InvocationPipeline, WorkFlowNode | tool_initialization, executing_tools | `packages/core/src/node/toolManager.ts` | ToolExecutionError |
| **Multi-step loop** | sendAI, tool execution | InvocationPipeline.execute | handling_steps → executing_tools → ... (loop) | `packages/core/src/messages/pipeline/agentStepLoop/` | Max rounds errors |
| **NodePersistenceManager** | Supabase/Mock persistence | WorkFlowNode | registering_nodes, memory updates | `packages/core/src/utils/persistence/node/nodePersistence.ts` | MemoryOperationError |
| **WorkflowEvaluator** | Fitness calculation, feedback generation | Workflow.evaluate | evaluating | `packages/core/src/evaluation/evaluators/WorkflowEvaluator.ts` | EvaluationError |
| **Persistence layer** | Supabase client | Various (save operations) | persisting_results | `packages/adapter-supabase/src/` | WorkflowPersistenceError |

### Key Data Structures Passed Between Components

1. **InvocationInput** → invokeWorkflow
   - `workflowVersionId` | `filename` | `dslConfig`
   - `evalInput`: EvaluationInput
   - `onProgress`: callback (optional)
   - `abortSignal`: AbortSignal (optional)

2. **WorkflowConfig** → Workflow.create
   - `entryNodeId`: string
   - `nodes`: WorkflowNodeConfig[]
   - `contextFile`: string (optional)
   - `toolsInformation`: object (optional)

3. **NodeInvocationCallContext** → WorkFlowNode.invoke
   - IDs: workflowId, workflowVersionId, workflowInvocationId
   - `nodeConfig`: WorkflowNodeConfig
   - `incomingMessage`: MessagePayload
   - `nodeMemory`: Record<string, string>
   - Tool context, workflow context

4. **ProcessedResponse** → Pipeline processing
   - Union type: TextProcessed | ToolProcessed | ErrorProcessed
   - Contains: text, toolCalls, or error details

5. **NodeInvocationResult** → Workflow coordination
   - `summaryWithInfo`: InvocationSummary
   - `replyMessage`: Payload
   - `outgoingMessages`: target-specific messages (optional)
   - `debugPrompts`: string[]

---

## Key Execution Paths

### Happy Path: Simple Text Generation

```
User clicks "Run"
→ authenticating (Clerk/API key)
→ extracting_providers (scan workflow for models)
→ validating_provider_keys (check lockbox)
→ validating_workflow (load + verify)
→ migrating_schema (upgrade if needed)
→ verifying_workflow (Zod + custom rules)
→ initializing_spending (set budget)
→ creating_workflow (instantiate)
→ preparing_workflow (context + memory)
→ initializing_nodes (create nodes)
→ registering_nodes (DB save)
→ workflow_executing (start DAG)
→ node_ready (entry node)
→ building_context (prepare messages)
→ resolving_model (catalog lookup)
→ initializing_pipeline (create pipeline)
→ pipeline_prepared (init tools)
→ checking_guards (rate/spending)
→ invoking_model (sendAI → generateText)
→ processing_response (parse text)
→ finalizing_node (summary + memory)
→ coordinating_handoff (check handOffs: ["end"])
→ evaluating (calculate fitness if eval data present)
→ persisting_results (save to DB)
→ workflow_complete (return to user)
```

### Happy Path: Multi-Step with Tools

```
[Same as above through checking_guards]
→ invoking_model (sendAI → generateText with tools)
→ processing_response (parse tool calls)
→ handling_steps (detect tool calls)
→ executing_tools (run MCP/code tools in parallel)
→ processing_tool_results (accumulate)
→ invoking_model (next round with tool results)
→ [Loop up to maxRounds times or until text response]
→ processing_response (final text)
→ finalizing_node (summary + memory)
[Continue as above]
```

### Error Path: Missing API Key

```
User clicks "Run"
→ authenticating (success)
→ extracting_providers (finds "openai")
→ validating_provider_keys (OPENAI_API_KEY not in lockbox)
→ missing_api_keys ERROR
→ Return 400 error: "This workflow requires OpenAI API key to run..."
→ User redirected to /settings/providers
```

### Error Path: Invalid Model Name

```
[Happy path through verifying_workflow]
→ verifying_workflow (calls verifyModelNameExists)
→ findModelByName("gpt-4o-mini") → found in catalog ✓
→ [Continue normally]

OR:

→ verifying_workflow (calls verifyModelNameExists)
→ findModelByName("invalid-model-xyz") → NOT found ✗
→ validation_failed ERROR
→ Return error: "Node 'main' has an invalid modelName: invalid-model-xyz"
```

### Error Path: Tool Execution Failure

```
[Happy path through executing_tools]
→ executing_tools (tool throws exception)
→ tool_execution_failed (captured by error handler)
→ processing_tool_results (includes error in results)
→ invoking_model (next round with error info)
→ [Agent may retry or return error response]
→ finalizing_node (completes with partial results)
→ [Workflow continues - tool errors don't fail workflow]
```

### Abort Path: User Cancellation

```
[Workflow in any executing state]
→ User clicks "Cancel"
→ POST /api/workflow/cancel with requestId
→ Redis publish "cancel:{requestId}"
→ Route handler receives pub/sub message
→ controller.abort() (triggers abortSignal)
→ cancelling (current operation aborts)
→ workflow_cancelled (cleanup)
→ Return cancelled response to user
```

---

## State Definitions

### Workflow-Level States

| State | Description | Entry Conditions | Exit Conditions |
|-------|-------------|------------------|-----------------|
| **idle** | No workflow running | Initial or after completion/failure | User initiates workflow |
| **authenticating** | Validating user credentials | User clicked "Run" | Auth succeeds or fails |
| **extracting_providers** | Determining required API providers | Auth succeeded | Providers extracted or error |
| **validating_provider_keys** | Checking API keys availability | Providers extracted | Keys validated or missing |
| **validating_workflow** | Loading workflow config | Keys validated (or skipped for API key auth) | Config loaded or error |
| **migrating_schema** | Upgrading workflow schema | Config loaded | Schema migrated |
| **verifying_workflow** | Running validation suite | Schema migrated | Validation passed or failed |
| **initializing_spending** | Setting up budget tracking | Validation passed | Spending initialized |
| **creating_workflow** | Instantiating Workflow object | Spending initialized | Workflow created |
| **preparing_workflow** | Setting up context and memory | Workflow created | Preparation complete or failed |
| **initializing_nodes** | Creating node instances | Workflow prepared | Nodes initialized or failed |
| **registering_nodes** | Saving nodes to database | Nodes initialized | Registration complete |
| **workflow_executing** | DAG traversal active | Nodes registered | All nodes complete or error |
| **evaluating** | Calculating fitness | Execution complete + eval data present | Evaluation done or failed |
| **persisting_results** | Saving to database | Evaluation complete | Persistence done or failed |
| **workflow_complete** | Successful completion | Results persisted | Return to idle |
| **cancelling** | Abort in progress | User requested cancel | Resources cleaned up |
| **workflow_cancelled** | Cancellation complete | Abort finished | Return to idle |

### Node-Level States

| State | Description | Entry Conditions | Exit Conditions |
|-------|-------------|------------------|-----------------|
| **node_ready** | Node selected for execution | Workflow executing or handoff | Invocation started |
| **building_context** | Preparing invocation context | Node ready | Context built |
| **resolving_model** | Looking up model in catalog | Context built | Model resolved or not found |
| **initializing_pipeline** | Creating InvocationPipeline | Model resolved | Pipeline created |
| **pipeline_prepared** | Tools and messages initialized | Pipeline created | Preparation complete or failed |
| **checking_guards** | Validating rate/spending limits | Pipeline prepared | Guards passed or failed |
| **invoking_model** | Calling AI provider API | Guards passed or tool results ready | Response received or error |
| **processing_response** | Parsing model output | Response received | Response parsed |
| **handling_steps** | Determining next action (tools or finalize) | Response parsed | Tool execution or finalization |
| **executing_tools** | Running tool functions | Tool calls detected | Tools complete or failed |
| **processing_tool_results** | Accumulating tool outputs | Tools executed | Results processed |
| **finalizing_node** | Creating summary and extracting memory | Text response received | Node complete |
| **coordinating_handoff** | Selecting next node(s) | Node finalized | Handoff determined or error |

### Pipeline States (Internal State Machine)

| State | Methods Allowed | Description |
|-------|----------------|-------------|
| **CREATED** | prepare() | Initial state after construction |
| **PREPARED** | execute() | Tools initialized, messages ready |
| **EXECUTING** | (internal) | Model invocation in progress |
| **EXECUTED** | process() | Model response received |
| **PROCESSING** | (internal) | Creating summary, extracting memory |
| **COMPLETED** | (read results) | Processing finished successfully |
| **ERROR** | (read error) | Error occurred during execution |

---

## Maintenance Guide

### When to Update This Document

1. **Adding a new state transition**
   - Add row to [Table 1](#table-1-state-transitions)
   - Update [Key Execution Paths](#key-execution-paths) if on happy path
   - Update [State Definitions](#state-definitions) if new state

2. **Handling a new error**
   - Add row to [Table 2](#table-2-error-state-matrix)
   - Document in [Key Execution Paths](#key-execution-paths) if common
   - Update recovery procedures

3. **Adding a new component**
   - Add row to [Table 3](#component-interaction-map)
   - Document its state responsibilities
   - List error types it can throw

4. **Changing execution flow**
   - Update affected rows in [Table 1](#table-1-state-transitions)
   - Update [Key Execution Paths](#key-execution-paths)
   - Verify error states still accurate

### Validation Checklist

When updating this document, verify:

- [ ] Every state has a "Current State" row in Table 1
- [ ] Every error in Table 2 appears as "Failure State" in Table 1
- [ ] Every component in Table 3 has file path
- [ ] All file paths are current (no moved files)
- [ ] Error recovery paths are actionable
- [ ] State transitions form a complete graph (no dead ends)

### Testing State Transitions

To validate this document against actual behavior:

1. **Run workflows with intentional failures**
   ```bash
   # Missing API key test
   unset OPENAI_API_KEY
   bun run invoke-test

   # Invalid model test
   # Edit workflow to use "invalid-model-name"
   bun run invoke-test
   ```

2. **Check error messages match Table 2**
   - User-facing message should match "User Sees" column
   - Error code should match "Error Code" column

3. **Verify state transitions with logging**
   - Enable verbose logging: `DEBUG=true`
   - Trace execution path through logs
   - Confirm states match Table 1 sequence

### Related Documentation

- [Workflow Configuration](../workflow/configuration.md) - Workflow DSL reference
- [Error Handling Guide](../guides/error-handling.md) - Best practices
- [Tool Integration](../tools/integration.md) - Tool system architecture
- [Model Catalog](../../packages/models/README.md) - Model registry docs

---

**Document Completeness**: This document covers the complete workflow execution flow from user action to result. It includes all major states, all documented error types, and all key components. As the system evolves, this document should be updated to remain the single source of truth.

**Last Validated Against Codebase**: 2025-10-13
