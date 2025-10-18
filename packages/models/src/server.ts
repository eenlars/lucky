/**
 * SERVER-ONLY exports from @lucky/models
 *
 * DO NOT import this in client-side code.
 * Use import from '@lucky/models/server'
 *
 * This module includes:
 * - Models class (with ConfigLoader that uses node:fs/promises)
 * - ConfigLoader (file system operations)
 * - defineConfig functions
 */

// Runtime guard: Fail immediately if imported in browser context
if (typeof globalThis !== "undefined" && "window" in globalThis && (globalThis as { window?: unknown }).window) {
  throw new Error(
    "[SECURITY] models/server.ts cannot be imported in client-side code. " +
      "This file contains server-only logic that uses Node.js filesystem APIs (node:fs/promises). " +
      "Import from '@lucky/models' instead for client-safe model utilities.",
  )
}

// Server-only exports
export { Models, createModels } from "./models"
export { ConfigLoader } from "./config/loader"
export { defineConfig, defineConfigUnsafe } from "./config/define"

// Facade (depends on Models class, so server-only)
export { getFacade, ModelsFacade, resetFacade } from "./facade"
export type { SelectionOptions } from "./facade"

// Re-export client-safe utilities for convenience (but NOT createModels sentinel)
export {
  ProviderRegistry,
  getRuntimeEnabledModels,
  getRuntimeEnabledProviders,
  getAllProviders,
  getCatalogStats,
  getModelsByProvider,
  getProviderInfo,
  MODEL_CATALOG,
  validateCatalogIntegrity,
  getPricingService,
  PricingService,
  resetPricingService,
  findModel,
  findModelByName,
  getActiveModelIds,
  getModel,
  getRegistry,
  ModelRegistry,
  resetRegistry,
  getSelector,
  PolicySelector,
  resetSelector,
  getLogger,
  ModelLogger,
  resetLogger,
  withPerformanceLogging,
  executionContextSchema,
  executionStrategySchema,
  experimentConfigSchema,
  modelsConfigSchema,
  modelSpecSchema,
  modelSpecStringSchema,
  modelSpecUnionSchema,
  providerConfigSchema,
  providerMetricsSchema,
  providersConfigSchema,
  safeValidateModelsConfig,
  safeValidateUserConfig,
  tierConfigSchema,
  tiersConfigSchema,
  userConfigSchema,
  validateModelsConfig,
  validateUserConfig,
  assertModelType,
  formatModelType,
  isModelType,
  normalizeModelType,
  parseModelType,
  tryNormalizeModelType,
} from "./index"

export type * from "./index"
