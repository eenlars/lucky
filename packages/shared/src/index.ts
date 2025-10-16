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
} from "./types/models"

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
export type { HandoffType, WorkflowConfig, WorkflowNodeConfig } from "./contracts/workflow"

// Provider contracts
export {
  apiKeyValidationSchema,
  catalogIdSchema,
  modelIdSchema,
  providerConfigSchema,
  providerKeyMappingSchema,
  providerNameSchema,
  providerSettingsSchema,
  // Alias: clarify this is UI/status provider config shape (not the enum)
  providerConfigSchema as providerStatusConfigSchema,
  providerStatusSchema,
  userModelPreferencesSchema,
  userProviderSettingsSchema,
} from "./contracts/providers"
export type {
  ApiKeyValidation,
  CatalogId,
  LuckyProvider,
  ModelId,
  ProviderConfig,
  ProviderKeyMapping,
  ProviderSettings,
  ProviderStatus,
  // Alias: clarify meaning at import sites
  ProviderConfig as ProviderStatusConfig,
  UserModelPreferences,
  UserProviderSettings,
} from "./contracts/providers"

// Model contracts
export {
  enrichedModelInfoSchema,
  modelCapabilitiesSchema,
  modelEntrySchema,
  modelPricingSchema,
  modelPricingTierSchema,
  modelSelectionSchema,
  modelSpeedSchema,
} from "./contracts/models"
export type {
  EnrichedModelInfo,
  ModelCapabilities,
  ModelEntry,
  ModelPricing,
  ModelPricingTier,
  ModelSelection,
  ModelSpeed,
} from "./contracts/models"

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
  AgentEvent,
  AgentStartEvent,
  AgentEndEvent,
  AgentErrorEvent,
  AgentToolStartEvent,
  AgentToolEndEvent,
} from "./types/agentEvents"

// NOTE: obs and file saver utilities use Node.js APIs (AsyncLocalStorage, fs, path)
// They are NOT exported here to keep this browser-safe
// Access them via:
// - @lucky/core (re-exports for server-side code)
// - Direct subpath imports if needed
