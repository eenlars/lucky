import { lgg } from "@core/utils/logging/Logger"
import { CONFIG } from "@runtime/settings/constants"

export interface ResilienceConfig {
  // global flags
  enabled: boolean
  useResilientQueueRun: boolean
  useResilientInvocationPipeline: boolean
  
  // checkpointing
  checkpointing: {
    enabled: boolean
    autoCheckpointIntervalMs: number
    maxCheckpoints: number
    resumeFromCheckpointByDefault: boolean
  }
  
  // circuit breaker defaults
  circuitBreaker: {
    failureThreshold: number
    successThreshold: number
    timeoutMs: number
    volumeThreshold: number
  }
  
  // retry defaults
  retry: {
    maxAttempts: number
    initialDelayMs: number
    maxDelayMs: number
    backoffMultiplier: number
    jitterFactor: number
  }
  
  // health monitoring
  healthMonitoring: {
    enabled: boolean
    checkIntervalMs: number
    degradedThreshold: number
    unhealthyThreshold: number
  }
  
  // dead letter queue
  deadLetterQueue: {
    enabled: boolean
    maxRetries: number
    retentionMs: number
  }
}

// default resilience configuration
const defaultConfig: ResilienceConfig = {
  enabled: true,
  useResilientQueueRun: true,
  useResilientInvocationPipeline: true,
  
  checkpointing: {
    enabled: true,
    autoCheckpointIntervalMs: 60000, // 1 minute
    maxCheckpoints: 5,
    resumeFromCheckpointByDefault: true,
  },
  
  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 30000,
    volumeThreshold: 10,
  },
  
  retry: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },
  
  healthMonitoring: {
    enabled: true,
    checkIntervalMs: 30000,
    degradedThreshold: 0.8,
    unhealthyThreshold: 0.5,
  },
  
  deadLetterQueue: {
    enabled: true,
    maxRetries: 3,
    retentionMs: 86400000, // 24 hours
  },
}

// merge with any existing CONFIG.resilience settings
export const RESILIENCE_CONFIG: ResilienceConfig = {
  ...defaultConfig,
  ...(CONFIG as any).resilience,
}

// log configuration on load
lgg.info("[ResilienceConfig] Loaded configuration:", {
  enabled: RESILIENCE_CONFIG.enabled,
  useResilientQueueRun: RESILIENCE_CONFIG.useResilientQueueRun,
  useResilientInvocationPipeline: RESILIENCE_CONFIG.useResilientInvocationPipeline,
  checkpointingEnabled: RESILIENCE_CONFIG.checkpointing.enabled,
  healthMonitoringEnabled: RESILIENCE_CONFIG.healthMonitoring.enabled,
})

// helper functions to check feature flags
export function isResilienceEnabled(): boolean {
  return RESILIENCE_CONFIG.enabled
}

export function shouldUseResilientQueueRun(): boolean {
  return RESILIENCE_CONFIG.enabled && RESILIENCE_CONFIG.useResilientQueueRun
}

export function shouldUseResilientInvocationPipeline(): boolean {
  return RESILIENCE_CONFIG.enabled && RESILIENCE_CONFIG.useResilientInvocationPipeline
}

export function isCheckpointingEnabled(): boolean {
  return RESILIENCE_CONFIG.enabled && RESILIENCE_CONFIG.checkpointing.enabled
}

export function isHealthMonitoringEnabled(): boolean {
  return RESILIENCE_CONFIG.enabled && RESILIENCE_CONFIG.healthMonitoring.enabled
}

// allow runtime configuration updates
export function updateResilienceConfig(updates: Partial<ResilienceConfig>): void {
  Object.assign(RESILIENCE_CONFIG, updates)
  lgg.info("[ResilienceConfig] Configuration updated:", updates)
}

// preset configurations for different environments
export const ResiliencePresets = {
  // maximum resilience for production
  production: {
    enabled: true,
    useResilientQueueRun: true,
    useResilientInvocationPipeline: true,
    checkpointing: {
      enabled: true,
      autoCheckpointIntervalMs: 30000, // 30 seconds
      maxCheckpoints: 10,
      resumeFromCheckpointByDefault: true,
    },
    circuitBreaker: {
      failureThreshold: 3,
      successThreshold: 2,
      timeoutMs: 60000,
      volumeThreshold: 5,
    },
    retry: {
      maxAttempts: 5,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.2,
    },
    healthMonitoring: {
      enabled: true,
      checkIntervalMs: 15000,
      degradedThreshold: 0.9,
      unhealthyThreshold: 0.7,
    },
    deadLetterQueue: {
      enabled: true,
      maxRetries: 5,
      retentionMs: 604800000, // 7 days
    },
  },
  
  // balanced for development
  development: {
    enabled: true,
    useResilientQueueRun: true,
    useResilientInvocationPipeline: true,
    checkpointing: {
      enabled: true,
      autoCheckpointIntervalMs: 120000, // 2 minutes
      maxCheckpoints: 3,
      resumeFromCheckpointByDefault: false,
    },
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 2,
      timeoutMs: 30000,
      volumeThreshold: 10,
    },
    retry: {
      maxAttempts: 3,
      initialDelayMs: 500,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    },
    healthMonitoring: {
      enabled: false,
      checkIntervalMs: 60000,
      degradedThreshold: 0.8,
      unhealthyThreshold: 0.5,
    },
    deadLetterQueue: {
      enabled: true,
      maxRetries: 3,
      retentionMs: 86400000, // 24 hours
    },
  },
  
  // minimal overhead for testing
  testing: {
    enabled: false,
    useResilientQueueRun: false,
    useResilientInvocationPipeline: false,
    checkpointing: {
      enabled: false,
      autoCheckpointIntervalMs: 300000,
      maxCheckpoints: 1,
      resumeFromCheckpointByDefault: false,
    },
    circuitBreaker: {
      failureThreshold: 10,
      successThreshold: 1,
      timeoutMs: 10000,
      volumeThreshold: 20,
    },
    retry: {
      maxAttempts: 1,
      initialDelayMs: 0,
      maxDelayMs: 0,
      backoffMultiplier: 1,
      jitterFactor: 0,
    },
    healthMonitoring: {
      enabled: false,
      checkIntervalMs: 300000,
      degradedThreshold: 0.5,
      unhealthyThreshold: 0.2,
    },
    deadLetterQueue: {
      enabled: false,
      maxRetries: 1,
      retentionMs: 3600000, // 1 hour
    },
  },
}

// apply preset configuration
export function applyResiliencePreset(preset: keyof typeof ResiliencePresets): void {
  const presetConfig = ResiliencePresets[preset]
  updateResilienceConfig(presetConfig)
  lgg.info(`[ResilienceConfig] Applied preset: ${preset}`)
}