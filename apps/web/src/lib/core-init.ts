/**
 * Core configuration initialization for the app module.
 *
 * This file initializes the core module with the monorepo's runtime configuration.
 * Must be called before any core functionality is used.
 */
import { initCoreConfig } from "@lucky/core/core-config/coreConfig"
import { CONFIG, MODELS, PATHS } from "@lucky/examples/settings/constants"

let initialized = false

/**
 * Initialize core with monorepo configuration.
 * Safe to call multiple times - only initializes once.
 */
export function initCore() {
  if (initialized) return

  initCoreConfig({
    paths: PATHS,
    models: {
      gateway: CONFIG.models.gateway,
      defaults: MODELS,
      inactive: CONFIG.models.inactive,
    },
    coordinationType: CONFIG.coordinationType,
    newNodeProbability: CONFIG.newNodeProbability,
    logging: CONFIG.logging,
    workflow: CONFIG.workflow,
    tools: CONFIG.tools,
    improvement: CONFIG.improvement,
    verification: CONFIG.verification,
    evolution: CONFIG.evolution,
    limits: CONFIG.limits,
    persistence: {
      useMockBackend: process.env.USE_MOCK_PERSISTENCE === "true",
      defaultBackend: process.env.USE_MOCK_PERSISTENCE === "true" ? "memory" : "supabase",
    },
  })

  initialized = true
}
