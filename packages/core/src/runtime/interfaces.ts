/**
 * Runtime interface contracts for core-runtime integration
 * This defines the boundary between core modules and runtime implementation
 */

import type { ModelName, ActiveModelName, Provider } from "./settings/models"
import type { FlowRuntimeConfig, FlowPathsConfig } from "../types"

export interface ModelRegistry {
  /**
   * Model name constants for backward compatibility
   */
  readonly MODELS: Record<string, ModelName>
  
  /**
   * Check if a model is currently active
   */
  isActive(model: ModelName): model is ActiveModelName
  
  /**
   * Get all active models
   */
  getActiveModels(): ActiveModelName[]
  
  /**
   * Get models for a specific provider
   */
  getModelsForProvider(provider: Provider): ModelName[]
  
  /**
   * Normalize a model name to an active equivalent
   * Returns the model if active, or finds best active alternative
   */
  normalizeModel(model: ModelName): ActiveModelName
  
  /**
   * Get model pricing information
   */
  getModelPricing(model: ModelName): {
    input: number
    output: number
    cached: number
    contextLength: number
  }
}

export interface ConfigProvider {
  /**
   * Get workflow configuration
   */
  readonly workflow: FlowRuntimeConfig["workflow"]
  
  /**
   * Get tool configuration
   */
  readonly tools: FlowRuntimeConfig["tools"]
  
  /**
   * Get improvement settings
   */
  readonly improvement: FlowRuntimeConfig["improvement"]
  
  /**
   * Get evolution configuration
   */
  readonly evolution: FlowRuntimeConfig["evolution"]
  
  /**
   * Get verification settings
   */
  readonly verification: FlowRuntimeConfig["verification"]
  
  /**
   * Get limits configuration
   */
  readonly limits: FlowRuntimeConfig["limits"]
}

export interface PathProvider {
  /**
   * Get file system paths for runtime operations
   */
  readonly paths: FlowPathsConfig
  
  /**
   * Resolve a relative path to absolute
   */
  resolve(relativePath: string): string
  
  /**
   * Get logging directory
   */
  getLoggingDir(): string
  
  /**
   * Get memory storage directory
   */
  getMemoryDir(): string
}

/**
 * Main runtime provider interface that core modules depend on
 */
export interface RuntimeProvider {
  /**
   * Model registry for model management
   */
  readonly models: ModelRegistry
  
  /**
   * Configuration provider
   */
  readonly config: ConfigProvider
  
  /**
   * Path provider for file operations
   */
  readonly paths: PathProvider
  
  /**
   * Runtime initialization status
   */
  readonly isInitialized: boolean
  
  /**
   * Initialize the runtime (called once at startup)
   */
  initialize(): Promise<void>
  
  /**
   * Validate runtime configuration
   */
  validate(): Promise<ValidationResult>
}

export interface ValidationResult {
  success: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Factory function type for creating runtime providers
 */
export type RuntimeProviderFactory = () => RuntimeProvider