/**
 * RuntimeProvider implementation - the main runtime service for core modules
 */

import type { 
  RuntimeProvider as IRuntimeProvider, 
  ConfigProvider, 
  PathProvider,
  ValidationResult 
} from "./interfaces"
import { ModelRegistry } from "./ModelRegistry"
import { CONFIG } from "./settings/constants.client"
import { PATHS } from "./settings/constants"
import { MODELS } from "./settings/models"

class ConfigProviderImpl implements ConfigProvider {
  get workflow() { return CONFIG.workflow }
  get tools() { return CONFIG.tools }
  get improvement() { return CONFIG.improvement }
  get evolution() { return CONFIG.evolution }
  get verification() { return CONFIG.verification }  
  get limits() { return CONFIG.limits }
}

class PathProviderImpl implements PathProvider {
  get paths() { return PATHS }
  
  resolve(relativePath: string): string {
    return require('path').resolve(PATHS.root, relativePath)
  }
  
  getLoggingDir(): string {
    return PATHS.node.logging
  }
  
  getMemoryDir(): string {
    return PATHS.node.memory.root
  }
}

export class RuntimeProvider implements IRuntimeProvider {
  private _models: ModelRegistry
  private _config: ConfigProvider
  private _paths: PathProvider
  private _initialized = false

  constructor() {
    this._models = new ModelRegistry()
    this._config = new ConfigProviderImpl()
    this._paths = new PathProviderImpl()
  }

  get models(): ModelRegistry {
    return this._models
  }

  get config(): ConfigProvider {
    return this._config
  }

  get paths(): PathProvider {
    return this._paths
  }

  get isInitialized(): boolean {
    return this._initialized
  }

  async initialize(): Promise<void> {
    if (this._initialized) {
      return
    }

    // Validate configuration before initializing
    const validation = await this.validate()
    if (!validation.success) {
      throw new Error(`Runtime initialization failed: ${validation.errors.join(', ')}`)
    }

    // Perform any async initialization here
    // For now, initialization is synchronous
    this._initialized = true
  }

  async validate(): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Validate that we have at least one active model
      const activeModels = this._models.getActiveModels()
      if (activeModels.length === 0) {
        errors.push("No active models configured")
      }

      // Validate that MODELS references point to active models
      const modelRefs = Object.values(MODELS)
      for (const modelRef of modelRefs) {
        if (typeof modelRef === 'string' && !this._models.isActive(modelRef as any)) {
          warnings.push(`Model reference '${modelRef}' points to inactive model`)
        }
      }

      // Validate paths exist (if running in Node.js environment)
      if (typeof process !== 'undefined' && process.versions?.node) {
        const fs = require('fs')
        try {
          if (!fs.existsSync(this._paths.paths.root)) {
            errors.push(`Root path does not exist: ${this._paths.paths.root}`)
          }
        } catch (e) {
          warnings.push(`Could not validate paths: ${e}`)
        }
      }

      return {
        success: errors.length === 0,
        errors,
        warnings
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Validation error: ${error}`],
        warnings
      }
    }
  }
}

// Singleton instance
let runtimeInstance: RuntimeProvider | null = null

/**
 * Get the global runtime provider instance
 */
export function getRuntimeProvider(): RuntimeProvider {
  if (!runtimeInstance) {
    runtimeInstance = new RuntimeProvider()
  }
  return runtimeInstance
}

/**
 * Initialize the runtime provider (should be called at app startup)
 */
export async function initializeRuntime(): Promise<RuntimeProvider> {
  const runtime = getRuntimeProvider()
  await runtime.initialize()
  return runtime
}