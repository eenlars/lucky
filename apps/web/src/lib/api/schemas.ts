import { z } from "zod"

// ============================================================================
// IMPORT EXISTING CONTRACTS (REUSE, DON'T DUPLICATE)
// ============================================================================

import { InvokeOptions, JsonRpcInvokeRequest, JsonRpcInvokeResponse } from "@lucky/shared/contracts/invoke"

import { WorkflowConfigSchema, WorkflowNodeConfigSchema } from "@lucky/shared/contracts/workflow"

import { EvaluationInputSchema, WorkflowIOSchema } from "@lucky/shared/contracts/ingestion"

import { ErrorReportSchema } from "@lucky/shared/contracts/error"

import { enrichedModelInfoSchema, modelEntrySchema } from "@lucky/shared/contracts/models"

// ============================================================================
// STANDARDIZED RESPONSE ENVELOPES
// ============================================================================

/**
 * Standard error shape for all API responses
 */
const ErrorEnvelope = z.object({
  code: z.string(),
  message: z.string(),
  timestamp: z.string().datetime(),
  details: z.unknown().optional(),
})

/**
 * Success response envelope - wraps data in consistent format
 */
const SuccessEnvelope = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    error: z.null().optional(),
  })

/**
 * Error response envelope - consistent error format
 */
const FailureEnvelope = z.object({
  success: z.literal(false),
  data: z.null().optional(),
  error: ErrorEnvelope,
})

/**
 * API response union - either success or error
 */
export const ApiResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([SuccessEnvelope(dataSchema), FailureEnvelope])

// ============================================================================
// API ENDPOINT SCHEMAS
// ============================================================================

export const apiSchemas = {
  // ============================================================================
  // CORE WORKFLOW APIs
  // ============================================================================

  /**
   * POST /api/invoke
   * Prompt-only workflow invocation (simplified invoke API)
   */
  invoke: {
    req: z.object({
      workflowVersionId: z.string().min(1),
      prompt: z.string().min(1),
    }),
    res: ApiResponse(z.unknown()), // Output depends on workflow
  },

  /**
   * POST /api/v1/invoke
   * Full JSON-RPC 2.0 workflow invocation (MCP-compliant)
   */
  "v1/invoke": {
    req: JsonRpcInvokeRequest,
    res: JsonRpcInvokeResponse,
  },

  /**
   * POST /api/workflow/invoke
   * Internal workflow invocation (used by other APIs)
   */
  "workflow/invoke": {
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
  },

  /**
   * GET /api/workflow/[wf_id]
   * Get workflow by ID with versions
   */
  "workflow/[wf_id]": {
    req: z.never().optional(),
    res: z.unknown(), // Workflow record with versions
  },

  /**
   * POST /api/workflow/save
   * Save workflow configuration
   */
  "workflow/save": {
    req: z.object({
      dsl: z.unknown(),
      commitMessage: z.string(),
      workflowId: z.string().optional(),
      parentId: z.string().optional(),
      iterationBudget: z.number().optional(),
      timeBudgetSeconds: z.number().optional(),
    }),
    res: ApiResponse(z.unknown()), // WorkflowVersion table record
  },

  /**
   * POST /api/workflow/verify
   * Verify workflow configuration is valid
   */
  "workflow/verify": {
    req: z.object({
      workflow: z.unknown(), // WorkflowConfig
      mode: z.string().optional(),
    }),
    res: z.unknown(), // JSON-RPC response or validation result
  },

  /**
   * GET /api/workflow/latest
   * Get latest workflow versions
   */
  "workflow/latest": {
    req: z.never().optional(),
    res: z.array(z.unknown()), // Returns workflow version records with complex structure
  },

  /**
   * POST /api/workflow/formalize
   * Convert natural language workflow to formal configuration
   */
  "workflow/formalize": {
    req: z.object({
      prompt: z.string(),
      options: z.unknown().optional(), // GenerationOptions & AfterGenerationOptions
    }),
    res: z.unknown(), // RS<WorkflowConfig>
  },

  /**
   * GET /api/workflow/config
   * Get workflow runtime configuration
   * POST /api/workflow/config
   * Save workflow configuration
   */
  "workflow/config": {
    req: z.unknown(), // WorkflowConfig or partial config
    res: z.unknown(), // WorkflowConfig or save result
  },

  // ============================================================================
  // INGESTION & DATA APIs
  // ============================================================================

  /**
   * POST /api/ingestions/upload
   * Upload dataset for workflow evaluation
   */
  "ingestions/upload": {
    req: z.object({
      name: z.string().min(1),
      data: z.unknown(), // Could be CSV, JSON, etc.
      type: z.enum(["csv", "json", "text"]),
    }),
    res: ApiResponse(
      z.object({
        datasetId: z.string(),
        recordCount: z.number().int().nonnegative(),
      }),
    ),
  },

  /**
   * GET /api/ingestions/list
   * List all datasets
   */
  "ingestions/list": {
    req: z.never().optional(),
    res: z.array(
      z.object({
        dataset_id: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        data_format: z.string(),
        created_at: z.string(),
      }),
    ),
  },

  /**
   * POST /api/ingestions/cases
   * Convert ingestion dataset to test cases
   */
  "ingestions/cases": {
    req: z.object({
      datasetId: z.string(),
    }),
    res: z.object({
      success: z.boolean(),
      cases: z.array(z.unknown()), // Test cases from IngestionLayer
    }),
  },

  // ============================================================================
  // USER MANAGEMENT APIs
  // ============================================================================

  /**
   * GET /api/user/profile
   * Get user profile
   */
  "user/profile": {
    req: z.never().optional(),
    res: z.object({
      profile: z.unknown(), // personalProfileSchema
    }),
  },

  /**
   * PUT /api/user/profile
   * Update user profile
   */
  "user/profile:put": {
    req: z.object({
      profile: z.unknown(), // personalProfileSchema
    }),
    res: z.object({
      success: z.boolean(),
      profile: z.unknown(),
    }),
  },

  /**
   * GET /api/user/api-key
   * Get user API key
   */
  "user/api-key": {
    req: z.never().optional(),
    res: ApiResponse(
      z.object({
        apiKey: z.string(),
        createdAt: z.string().datetime(),
        expiresAt: z.string().datetime().optional(),
      }),
    ),
  },

  /**
   * POST /api/user/api-key/generate
   * Generate new API key
   */
  "user/api-key/generate": {
    req: z.object({
      name: z.string().optional(),
    }),
    res: ApiResponse(
      z.object({
        apiKey: z.string(),
        createdAt: z.string().datetime(),
      }),
    ),
  },

  /**
   * POST /api/user/api-key/roll
   * Roll/rotate API key
   */
  "user/api-key/roll": {
    req: z.object({
      confirm: z.literal(true),
    }),
    res: ApiResponse(
      z.object({
        apiKey: z.string(),
        createdAt: z.string().datetime(),
      }),
    ),
  },

  /**
   * GET /api/user/env-keys
   * Get user environment keys (lockbox)
   */
  "user/env-keys": {
    req: z.never().optional(),
    res: ApiResponse(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          createdAt: z.string(),
        }),
      ),
    ),
  },

  /**
   * POST /api/user/env-keys
   * Set environment key
   */
  "user/env-keys/set": {
    req: z.object({
      key: z.string().regex(/^[A-Z_][A-Z0-9_]*$/),
      value: z.string(),
    }),
    res: ApiResponse(
      z.object({
        updated: z.boolean(),
      }),
    ),
  },

  /**
   * GET /api/user/env-keys/[name]
   * Get specific environment key value
   */
  "user/env-keys/[name]": {
    req: z.never().optional(),
    res: z.object({
      id: z.string(),
      name: z.string(),
      value: z.string(),
      createdAt: z.string(),
    }),
  },

  /**
   * GET /api/user/model-preferences
   * Get user model preferences (returns UserModelPreferences)
   */
  "user/model-preferences": {
    req: z.never().optional(),
    res: z.unknown(), // Returns UserModelPreferences schema from shared
  },

  /**
   * PUT /api/user/model-preferences
   * Update user model preferences
   */
  "user/model-preferences:put": {
    req: z.unknown(), // UserModelPreferences
    res: z.unknown(), // UserModelPreferences
  },

  /**
   * GET /api/user/workflows
   * Get user workflows with MCP discovery info
   */
  "user/workflows": {
    req: z.never().optional(),
    res: z.array(
      z.object({
        workflow_id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        inputSchema: z.unknown().optional(),
        outputSchema: z.unknown().optional(),
        created_at: z.string(),
      }),
    ),
  },

  // ============================================================================
  // PROVIDER & MODEL APIs
  // ============================================================================

  /**
   * POST /api/models
   * Query model catalog with various actions
   */
  models: {
    req: z.object({
      action: z.enum(["getActiveModelNames", "getModelV2", "getModelsByProvider"]),
      model: z.string().optional(),
      provider: z.string(),
    }),
    res: z.object({
      models: z.array(z.unknown()).optional(),
      model: z.unknown().optional(),
    }),
  },

  /**
   * POST /api/providers/[provider]/models
   * Fetch models from provider API
   */
  "providers/[provider]/models": {
    req: z.object({
      apiKey: z.string().min(1),
      includeMetadata: z.boolean().optional(),
    }),
    res: z.object({
      models: z.union([z.array(z.string()), z.array(enrichedModelInfoSchema)]),
    }),
  },

  /**
   * POST /api/providers/test-connection
   * Test provider connection
   */
  "providers/test-connection": {
    req: z.object({
      provider: z.string().min(1),
      apiKey: z.string().min(1),
    }),
    res: ApiResponse(
      z.object({
        connected: z.boolean(),
        message: z.string().optional(),
      }),
    ),
  },

  // ============================================================================
  // HEALTH & STATUS APIs
  // ============================================================================

  /**
   * GET /api/health/credentials
   * Check if required credentials are set
   */
  "health/credentials": {
    req: z.never().optional(),
    res: z.object({
      hasOpenAI: z.boolean(),
      hasAnthropic: z.boolean(),
      hasOpenRouter: z.boolean(),
      timestamp: z.string().datetime(),
    }),
  },

  /**
   * GET /api/health/credentials/all
   * Check all credentials status
   */
  "health/credentials/all": {
    req: z.never().optional(),
    res: z.object({
      credentials: z.record(z.string(), z.boolean()),
      timestamp: z.string().datetime(),
    }),
  },

  /**
   * GET /api/health/features
   * Check feature flags
   */
  "health/features": {
    req: z.never().optional(),
    res: z.object({
      features: z.record(z.string(), z.boolean()),
      timestamp: z.string().datetime(),
    }),
  },

  /**
   * GET /api/health/openrouter
   * Check OpenRouter connection status
   */
  "health/openrouter": {
    req: z.never().optional(),
    res: z.object({
      connected: z.boolean(),
      message: z.string().optional(),
      timestamp: z.string().datetime(),
    }),
  },

  /**
   * GET /api/network
   * Monitor network requests for a URL
   */
  network: {
    req: z.never().optional(),
    res: z.unknown(), // Network monitor returns dynamic structure
  },

  // ============================================================================
  // AI & AGENT APIs
  // ============================================================================

  /**
   * POST /api/agent/chat
   * Chat with agent
   */
  "agent/chat": {
    req: z.object({
      message: z.string().min(1),
      conversationId: z.string().optional(),
    }),
    res: ApiResponse(
      z.object({
        reply: z.string(),
        conversationId: z.string(),
      }),
    ),
  },

  /**
   * POST /api/ai/simple
   * Simple AI completion
   */
  "ai/simple": {
    req: z.object({
      prompt: z.string().min(1),
      model: z.string().optional(),
    }),
    res: ApiResponse(
      z.object({
        completion: z.string(),
      }),
    ),
  },

  /**
   * POST /api/ai/artifact
   * Generate AI artifact (code, text, etc.)
   */
  "ai/artifact": {
    req: z.object({
      prompt: z.string().min(1),
      type: z.enum(["code", "text", "markdown", "json"]),
    }),
    res: ApiResponse(
      z.object({
        artifact: z.string(),
        type: z.string(),
      }),
    ),
  },

  // ============================================================================
  // UTILITIES & DEV APIs
  // ============================================================================

  /**
   * POST /api/log-error
   * Log client-side error
   */
  "log-error": {
    req: ErrorReportSchema,
    res: ApiResponse(
      z.object({
        logged: z.boolean(),
        errorId: z.string().optional(),
      }),
    ),
  },

  /**
   * POST /api/feedback
   * Submit user feedback
   */
  feedback: {
    req: z.object({
      message: z.string().min(1),
      type: z.enum(["bug", "feature", "improvement", "other"]),
      context: z.unknown().optional(),
    }),
    res: ApiResponse(
      z.object({
        submitted: z.boolean(),
        feedbackId: z.string().optional(),
      }),
    ),
  },

  /**
   * POST /api/clerk/webhooks
   * Clerk webhook handler
   */
  "clerk/webhooks": {
    req: z.unknown(), // Webhook payload varies
    res: z.object({
      received: z.boolean(),
    }),
  },

  /**
   * POST /api/cron/cleanup
   * Cron job for cleanup tasks
   */
  "cron/cleanup": {
    req: z.object({
      type: z.enum(["workflows", "traces", "logs", "all"]),
      olderThan: z.string().datetime().optional(),
    }),
    res: ApiResponse(
      z.object({
        cleaned: z.number().int().nonnegative(),
      }),
    ),
  },

  /**
   * POST /api/dev/pipeline/invoke
   * Development pipeline invocation
   */
  "dev/pipeline/invoke": {
    req: z.object({
      pipelineId: z.string().min(1),
      input: z.unknown(),
    }),
    res: ApiResponse(
      z.object({
        output: z.unknown(),
        pipelineId: z.string(),
      }),
    ),
  },

  /**
   * GET /api/help/icon
   * Get help icon SVG
   */
  "help/icon": {
    req: z.never().optional(),
    res: z.string(), // SVG content
  },

  /**
   * POST /api/lockbox/secrets
   * Create or update a secret in lockbox
   * GET /api/lockbox/secrets
   * Get lockbox secret metadata or decrypted value
   */
  "lockbox/secrets": {
    req: z.object({
      name: z.string(),
      namespace: z.string().optional(),
      value: z.string(),
    }),
    res: z.object({
      id: z.string(),
      name: z.string(),
      namespace: z.string().optional(),
      version: z.number(),
      createdAt: z.string(),
      lastUsedAt: z.string().optional(),
      value: z.string().optional(),
    }),
  },

  /**
   * GET /api/lockbox/secrets with reveal flag
   */
  "lockbox/secrets:get": {
    req: z.never().optional(),
    res: z.object({
      id: z.string(),
      name: z.string(),
      namespace: z.string().optional(),
      version: z.number(),
      createdAt: z.string().optional(),
      lastUsedAt: z.string().optional(),
      value: z.string().optional(),
    }),
  },

  // ============================================================================
  // TEST APIs
  // ============================================================================

  /**
   * GET /api/test
   * Test X.AI API connection
   */
  test: {
    req: z.never().optional(),
    res: z.object({
      message: z.string(),
      status: z.string(),
      timestamp: z.string(),
      error: z.string().optional(),
      note: z.string().optional(),
      details: z.string().optional(),
    }),
  },

  /**
   * POST /api/test
   * Send message to X.AI API
   */
  "test:post": {
    req: z.object({
      message: z.string().min(1),
    }),
    res: ApiResponse(
      z.object({
        message: z.string(),
        receivedMessage: z.string(),
        timestamp: z.string(),
      }),
    ),
  },

  /**
   * GET /api/test/approve
   * Process approval workflow (handles file-based approvals)
   */
  "test/approve": {
    req: z.never().optional(), // Uses query params
    res: z.object({
      text: z.string(),
    }),
  },

  /**
   * POST /api/test/calculate-cost
   * Test cost calculation
   */
  "test/calculate-cost": {
    req: z.object({
      model: z.string(),
      inputTokens: z.number().int().nonnegative().optional(),
      outputTokens: z.number().int().nonnegative().optional(),
      usage: z
        .object({
          inputTokens: z.number().int().nonnegative(),
          outputTokens: z.number().int().nonnegative(),
          cachedInputTokens: z.number().int().nonnegative().optional(),
        })
        .optional(),
    }),
    res: z.object({
      cost: z.number().min(0),
      currency: z.literal("USD"),
    }),
  },

  /**
   * GET /api/test/help
   * Test help endpoint
   */
  "test/help": {
    req: z.never().optional(),
    res: z.object({
      message: z.string(),
    }),
  },

  /**
   * GET /api/workflow/invocations
   * List workflow invocations with filtering, sorting, and pagination
   */
  "workflow/invocations": {
    req: z.never().optional(), // Uses query params
    res: ApiResponse(
      z.object({
        data: z.array(z.unknown()), // Complex joined data from WorkflowInvocation + WorkflowVersion + Workflow
        totalCount: z.number().int().nonnegative(),
        page: z.number().int().positive(),
        pageSize: z.number().int().positive(),
        aggregates: z.object({
          totalSpent: z.number().min(0),
          avgAccuracy: z.number().nullable(),
          failedCount: z.number().int().nonnegative(),
        }),
      }),
    ),
  },

  /**
   * DELETE /api/workflow/invocations
   * Delete multiple workflow invocations by ID
   */
  "workflow/invocations/delete": {
    req: z.object({
      ids: z.array(z.string()).min(1),
    }),
    res: ApiResponse(
      z.object({
        success: z.literal(true),
        deletedCount: z.number().int().nonnegative(),
      }),
    ),
  },

  /**
   * GET /api/workflow/status/[invocationId]
   * Get current state of a workflow execution
   */
  "workflow/status/[invocationId]": {
    req: z.never().optional(),
    res: z.object({
      state: z.enum(["running", "cancelling", "cancelled", "completed", "failed", "not_found"]),
      invocationId: z.string(),
      createdAt: z.number().optional(),
      cancelRequestedAt: z.number().optional(),
    }),
  },

  /**
   * POST /api/workflow/upsert-workflow
   * Create or update a workflow version
   */
  "workflow/upsert-workflow": {
    req: z.object({
      dsl: z.unknown(), // WorkflowConfig
      workflowVersionId: z.string().optional(),
      workflowName: z.string().optional(),
      commitMessage: z.string().min(1),
      iterationBudget: z.number().int().positive().optional(),
      timeBudgetSeconds: z.number().int().positive().optional(),
    }),
    res: ApiResponse(
      z.object({
        success: z.literal(true),
        data: z.unknown(), // WorkflowVersion
      }),
    ),
  },

  /**
   * GET /api/workflow/version/[wf_version_id]
   * Get a specific workflow version by ID
   */
  "workflow/version/[wf_version_id]": {
    req: z.never().optional(),
    res: z.unknown(), // WorkflowVersion record
  },

  /**
   * GET /api/workflow/versions/latest
   * List latest workflow versions
   */
  "workflow/versions/latest": {
    req: z.never().optional(), // Uses query params (limit)
    res: z.array(z.unknown()), // WorkflowVersion[]
  },

  /**
   * GET /api/evolution-runs
   * List evolution runs with filtering
   */
  "evolution-runs": {
    req: z.never().optional(), // Uses query params
    res: z.array(z.unknown()), // EvolutionRun with computed fields
  },

  /**
   * GET /api/evolution/[run_id]
   * Get a specific evolution run
   */
  "evolution/[run_id]": {
    req: z.never().optional(),
    res: z.unknown(), // EvolutionRun
  },

  /**
   * GET /api/evolution/[run_id]/generations
   * Get generations for an evolution run
   */
  "evolution/[run_id]/generations": {
    req: z.never().optional(),
    res: z.array(
      z.object({
        generation: z.unknown(),
        versions: z.array(z.unknown()),
        invocations: z.array(z.unknown()),
      }),
    ),
  },

  /**
   * GET /api/evolution/[run_id]/trace
   * Get evolution trace visualization
   */
  "evolution/[run_id]/trace": {
    req: z.never().optional(),
    res: z.object({
      graph: z.unknown(),
      visualization: z.unknown(),
      entryInvocation: z.unknown(),
    }),
  },

  /**
   * GET /api/trace/[wf_inv_id]/node-invocations
   * Get node invocations for a workflow invocation
   */
  "trace/[wf_inv_id]/node-invocations": {
    req: z.never().optional(),
    res: z.unknown(), // NodeInvocation[]
  },

  /**
   * GET /api/ingestions/[datasetId]
   * Get dataset with records
   */
  "ingestions/[datasetId]": {
    req: z.never().optional(),
    res: z.object({
      datasetId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      data_format: z.string(),
      createdAt: z.string(),
      records: z.array(z.unknown()),
    }),
  },

  /**
   * PUT /api/ingestions/[datasetId]/evaluation
   * Update dataset evaluation config
   */
  "ingestions/[datasetId]/evaluation": {
    req: z.object({
      type: z.string(),
      inputField: z.string().optional(),
      params: z.unknown().optional(),
    }),
    res: z.object({
      success: z.literal(true),
    }),
  },

  /**
   * PUT /api/ingestions/[datasetId]/goal
   * Update dataset goal
   */
  "ingestions/[datasetId]/goal": {
    req: z.object({
      goal: z.string(),
    }),
    res: z.object({
      success: z.literal(true),
    }),
  },

  /**
   * GET /api/ingestions/[datasetId]/ios
   * Get dataset input/output pairs
   */
  "ingestions/[datasetId]/ios": {
    req: z.never().optional(),
    res: z.array(
      z.object({
        id: z.string(),
        input: z.string(),
        expected: z.string(),
      }),
    ),
  },

  /**
   * POST /api/ingestions/[datasetId]/ios
   * Add input/output pair
   */
  "ingestions/[datasetId]/ios/create": {
    req: z.object({
      input: z.string(),
      expected: z.string(),
    }),
    res: z.object({
      id: z.string(),
      input: z.string(),
      expected: z.string(),
    }),
  },

  /**
   * PUT /api/ingestions/[datasetId]/ios/[ioId]
   * Update input/output pair
   */
  "ingestions/[datasetId]/ios/[ioId]": {
    req: z.object({
      input: z.string().optional(),
      expected: z.string().optional(),
    }),
    res: z.object({
      id: z.string(),
      input: z.string(),
      expected: z.string(),
    }),
  },

  /**
   * DELETE /api/ingestions/[datasetId]/ios/[ioId]
   * Delete input/output pair
   */
  "ingestions/[datasetId]/ios/[ioId]/delete": {
    req: z.never().optional(),
    res: z.object({
      success: z.literal(true),
    }),
  },
} as const

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Union of all endpoint names (for type-safe API calls)
 */
export type Endpoint = keyof typeof apiSchemas

/**
 * Extract request schema type for an endpoint
 */
export type Req<E extends Endpoint> = z.infer<(typeof apiSchemas)[E]["req"]>

/**
 * Extract response schema type for an endpoint
 */
export type Res<E extends Endpoint> = z.infer<(typeof apiSchemas)[E]["res"]>
