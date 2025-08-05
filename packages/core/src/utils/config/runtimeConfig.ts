import { SETTINGS } from "@example/index"
import type {
  FlowPathsConfig,
  FlowRuntimeConfig,
  FlowSettings,
  ModelConfig,
  ModelRuntimeConfig,
} from "@utils/config/runtimeConfig.types"

// Ingest settings immediately
const settings: FlowSettings = SETTINGS

// Main config accessor functions
export function getSettings(): FlowRuntimeConfig {
  return settings.config
}

export function getPaths(): FlowPathsConfig {
  return settings.paths
}

export function getModelSettings(): ModelRuntimeConfig {
  return settings.modelSettings
}

export function getModels(): ModelConfig {
  return settings.modelSettings.models
}

// Other config accessors
export function getRuntimeConfig(): FlowRuntimeConfig {
  return settings.config
}

export function getPathsConfig(): FlowPathsConfig {
  return settings.paths
}

export function getEvolutionConfig() {
  return settings.evolution
}

export function getToolsConfig() {
  return settings.tools
}

export function getLogging() {
  return settings.config.logging
}

export function getInputsConfig() {
  return settings.inputs
}

export function getFlowSettings(): FlowSettings {
  return settings
}
