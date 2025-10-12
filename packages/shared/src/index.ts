// Public API surface (browser-safe only)
// Node.js-only exports (csv, fs) are available via subpath exports:
//   - @lucky/shared/fs
//   - @lucky/shared/csv

// Browser-safe utilities
export * from "./utils/files/json/jsonParse"
export * from "./utils/common/isNir"
export * from "./utils/common/id"
export * from "./utils/common/array"
export * from "./utils/zod/withDescriptions"

// Supabase credentials - import via subpath exports:
//   - @lucky/shared/supabase-credentials.server (server-only)
//   - @lucky/shared/supabase-credentials.client (browser-safe)

// Result type and helper
export type { RS } from "./types/result.types"
export { R } from "./types/result.types"

// Types
export type {
  Database,
  PublicDatabase,
  IamDatabase,
  LockboxDatabase,
  AppDatabase,
  MCPDatabase,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./types/supabase.types"
export type {
  StandardizedLocation,
  LocationData,
  PartialLocationData,
  WorkflowLocationData,
} from "./types/location.types"
export {
  DataQuality,
  locationDataSchema,
  exampleLocationData,
} from "./types/location.types"
export type {
  CodeToolName,
  CodeToolFailure,
  CodeToolSuccess,
  CodeToolResult,
} from "./types/tool.types"
export { Tools } from "./types/tool.types"

// Model types and data
// Note: Most model types are now simplified to string. Runtime validation handles correctness.
export type {
  LuckyProvider,
  ModelPricingV2,
  AnyModelName,
  AllowedModelName,
  ModelName,
  OpenRouterModelName,
  TokenUsage,
  StandardModels,
  ModelPool,
  ActiveModelName,
} from "./types/models"
export { providersV2 } from "./types/models"

// Memory schemas
export * from "./utils/memory/memorySchema"

// Message types
export type {
  TextContent,
  Annotations,
  MessageType,
  BasePayload,
  SequentialPayload,
  DelegationPayload,
  ReplyPayload,
  AggregatedPayload,
  Payload,
} from "./types/message"
export { isDelegationPayload, isSequentialPayload, extractTextFromPayload } from "./types/message"

// Workflow types
export type { WorkflowFile, OutputSchema } from "./types/workflow"

// Provider contracts
export type {
  ProviderKeyMapping,
  ProviderSettings,
  ProviderConfig,
  ApiKeyValidation,
  ProviderStatus,
} from "./contracts/providers"
export {
  providerNameSchema,
  apiKeySchema,
  providerKeyMappingSchema,
  providerSettingsSchema,
  providerConfigSchema,
  apiKeyValidationSchema,
  providerStatusSchema,
} from "./contracts/providers"

// Model contracts
export type {
  ModelSpeed,
  ModelPricingTier,
  ModelCapabilities,
  ModelPricing,
  ModelEntry,
  EnrichedModelInfo,
  ModelSelection,
} from "./contracts/models"
export {
  modelSpeedSchema,
  modelPricingTierSchema,
  modelCapabilitiesSchema,
  modelPricingSchema,
  modelEntrySchema,
  enrichedModelInfoSchema,
  modelSelectionSchema,
} from "./contracts/models"

// NOTE: obs and file saver utilities use Node.js APIs (AsyncLocalStorage, fs, path)
// They are NOT exported here to keep this browser-safe
// Access them via:
// - @lucky/core (re-exports for server-side code)
// - Direct subpath imports if needed
