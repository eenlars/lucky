// Public API surface (browser-safe only)
// Node.js-only exports (csv, fs) are available via subpath exports:
//   - @lucky/shared/fs
//   - @lucky/shared/csv

// Browser-safe utilities
export * from "./utils/common/array"
export * from "./utils/common/id"
export * from "./utils/common/isNir"
export * from "./utils/files/json/jsonParse"
export * from "./utils/model-preferences"
export * from "./utils/zod/withDescriptions"

// Supabase credentials - import via subpath exports:
//   - @lucky/shared/supabase-credentials.server (server-only)
//   - @lucky/shared/supabase-credentials.client (browser-safe)

// Result type and helper
export { R } from "./types/result.types"
export type { RS } from "./types/result.types"

// Types
export {
  DataQuality,
  exampleLocationData,
  locationDataSchema,
} from "./types/location.types"
export type {
  LocationData,
  PartialLocationData,
  StandardizedLocation,
  WorkflowLocationData,
} from "./types/location.types"
export type {
  AppDatabase,
  Database,
  Enums,
  IamDatabase,
  Json,
  LockboxDatabase,
  MCPDatabase,
  PublicDatabase,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./types/supabase.types"
export { Tools } from "./types/tool.types"
export type {
  CodeToolFailure,
  CodeToolName,
  CodeToolResult,
  CodeToolSuccess,
} from "./types/tool.types"

// Model types and data
// Note: Most model types are now simplified to string. Runtime validation handles correctness.
export type {
  StandardModels,
  TokenUsage,
} from "./contracts/llm-contracts/models-old"

// Memory schemas
export * from "./utils/memory/memorySchema"

// Message types
export { extractTextFromPayload, isDelegationPayload, isSequentialPayload } from "./types/message"
export type {
  AggregatedPayload,
  Annotations,
  BasePayload,
  DelegationPayload,
  MessageType,
  Payload,
  ReplyPayload,
  SequentialPayload,
  TextContent,
} from "./types/message"

// Workflow types
export type { OutputSchema, WorkflowFile } from "./types/workflow"

// Workflow contracts
export { HandoffTypeSchema, WorkflowConfigSchema, WorkflowNodeConfigSchema } from "./contracts/workflow"
export type { HandoffType, WorkflowConfigZ, WorkflowNodeConfig } from "./contracts/workflow"

// Provider contracts
export {
  gatewayApiKeyValidationSchema,
  gatewayConfigSchema,
  gatewayEntrySchema,
  gatewayKeyMappingSchema,
  gatewayNameSchema,
  gatewaySettingsSchema,
  gatewayStatusSchema,
  modelIdSchema,
  userGatewayPreferencesSchema,
  userGatewaySettingsSchema,
} from "./contracts/llm-contracts/providers"
export type {
  GatewayApiKeyValidation,
  GatewayConfig,
  GatewayEntry,
  GatewayKeyMapping,
  GatewaySettings,
  GatewayStatus,
  LuckyGateway,
  ModelId,
  UserGatewayPreferences,
  UserGatewaySettings,
} from "./contracts/llm-contracts/providers"

// Model contracts
export {
  enrichedModelInfoSchema,
  modelCapabilitiesSchema,
  modelEntrySchema,
  modelPricingSchema,
  modelPricingTierSchema,
  modelSpeedSchema,
  tierNameSchema,
} from "./contracts/llm-contracts/models"
export type {
  EnrichedModelInfo,
  ModelCapabilities,
  ModelEntry,
  ModelPricing,
  ModelPricingTier,
  ModelSpeed,
  TierName,
} from "./contracts/llm-contracts/models"

// Error contracts
export { ErrorReportSchema, SeverityLevelSchema } from "./contracts/error"
export type { ErrorReportInput, SeverityLevel } from "./contracts/error"

// Workflow progress contracts
export {
  WORKFLOW_PROGRESS_SCHEMA_VERSION,
  workflowProgressEventSchema,
} from "./contracts/workflow-progress"
export type { WorkflowEventHandler, WorkflowProgressEvent } from "./contracts/workflow-progress"

// MCP Connectors contracts
export {
  createPublisherSchema,
  createServerSchema,
  createTagSchema,
  createToolSchema,
  publisherSchema,
  serverSchema,
  serverVersionSchema,
  tagSchema,
  toolkitSchema,
  toolSchema,
  validateMockToolkits,
  validateToolkit,
  validateToolkitSafe,
} from "./contracts/mcp"
export type {
  CreatePublisher,
  CreateServer,
  CreateTag,
  CreateTool,
  Publisher,
  Server,
  ServerVersion,
  Tag,
  Tool,
  Toolkit,
} from "./contracts/mcp"

// MCP Runtime contracts (execution context)
export {
  executionMCPContextSchema,
  mcpToolkitMapSchema,
  mcpToolkitSchema,
  mcpTransportSpecSchema,
  mcpTransportStdioSpecSchema,
  uiConfigToToolkit,
  uiConfigToToolkits,
  validateToolkitMap,
} from "./contracts/mcp-runtime"
export type {
  ExecutionMCPContext,
  MCPToolkit,
  MCPToolkitMap,
  MCPTransportSpec,
  MCPTransportStdioSpec,
} from "./contracts/mcp-runtime"

// Extended app database types for custom functions
export type {
  DatabaseWithAppFunctions,
  UpsertErrorParams,
  UpsertErrorResult,
} from "./types/app-functions.types"

// Execution contracts
export {
  ZPrincipal,
  type Principal,
} from "./contracts/execution"

// Agent event types
export type {
  AgentEndEvent,
  AgentErrorEvent,
  AgentEvent,
  AgentStartEvent,
  AgentToolEndEvent,
  AgentToolStartEvent,
} from "./types/agentEvents"

// NOTE: obs and file saver utilities use Node.js APIs (AsyncLocalStorage, fs, path)
// They are NOT exported here to keep this browser-safe
// Access them via:
// - @lucky/core (re-exports for server-side code)
// - Direct subpath imports if needed
