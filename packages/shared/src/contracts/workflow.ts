import type { JSONSchema7 } from "json-schema"
import { z } from "zod"
import { JsonSchemaZ } from "../utils/validateJsonSchema"

/**
 * Handoff type for workflow nodes
 */
export const HandoffTypeSchema = z.enum(["conditional", "sequential", "parallel"])

/**
 * Declarative configuration for a single workflow node.
 * modelName accepts any model from any provider - validation happens at runtime
 */
export const WorkflowNodeConfigSchema = z.object({
  nodeId: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  modelName: z.string(), // AnyModelName - string for now to avoid circular deps
  mcpTools: z.array(z.string()), // MCPToolName[] - string[] for now
  codeTools: z.array(z.string()), // CodeToolName[] - string[] for now
  handOffs: z.array(z.string()),
  memory: z.record(z.string(), z.string()).nullable().optional(),
  waitingFor: z.array(z.string()).optional(),
  waitFor: z.array(z.string()).optional(), // Alternative name for waitingFor, both are supported
  handOffType: HandoffTypeSchema.optional(),
  useClaudeSDK: z.boolean().optional(), // Enable Claude Code SDK for this node
  sdkConfig: z.any().optional(), // ClaudeSDKConfig - any for now to avoid circular deps
  requiresApproval: z.boolean().optional(), // Human-in-the-loop gate for this node
  approvalPrompt: z.string().optional(), // Prompt shown to human reviewer
  connectors: z.array(z.string()).optional(), // External connectors attached to this node
})

/**
 * Current schema version for workflow migrations.
 * Increment this when making breaking changes to the workflow schema.
 */
export const CURRENT_SCHEMA_VERSION = 1

/**
 * Layout position for visual editor nodes
 */
export const NodeLayoutSchema = z.object({
  nodeId: z.string(),
  x: z.number(),
  y: z.number(),
})

/**
 * Layout metadata for visual workflow editor
 */
export const WorkflowLayoutSchema = z.object({
  nodes: z.array(NodeLayoutSchema),
  // Future: viewport zoom, pan, etc.
})

/**
 * UI metadata for visual workflow editor
 */
export const WorkflowUISchema = z.object({
  layout: WorkflowLayoutSchema.optional(),
  // Future: viewport, theme, collapsed panels, etc.
})

/**
 * WorkflowConfig defines workflow structure with nodes, handoffs and metadata.
 */
export const WorkflowConfigSchema = z.object({
  __schema_version: z.number().optional(),
  nodes: z.array(WorkflowNodeConfigSchema),
  entryNodeId: z.string(),
  contextFile: z.string().nullable().optional(),
  memory: z.record(z.string(), z.string()).nullable().optional(),
  toolsInformation: z.any().optional(),
  inputSchema: JsonSchemaZ.optional(),
  outputSchema: JsonSchemaZ.optional(),
  ui: WorkflowUISchema.optional(), // UI-specific metadata
})

export type WorkflowNodeConfig = z.infer<typeof WorkflowNodeConfigSchema>
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>
export type HandoffType = z.infer<typeof HandoffTypeSchema>
export type JsonSchemaDefinition = JSONSchema7
export type NodeLayout = z.infer<typeof NodeLayoutSchema>
export type WorkflowLayout = z.infer<typeof WorkflowLayoutSchema>
export type WorkflowUI = z.infer<typeof WorkflowUISchema>
