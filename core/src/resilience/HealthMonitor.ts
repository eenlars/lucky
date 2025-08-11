import { lgg } from "@core/utils/logging/Logger"
import { EventEmitter } from "events"
import type { CircuitBreakerStats } from "./CircuitBreaker"
import { CircuitBreakerFactory } from "./CircuitBreaker"

export enum HealthStatus {
  HEALTHY = "HEALTHY",
  DEGRADED = "DEGRADED",
  UNHEALTHY = "UNHEALTHY",
}

export interface ComponentHealth {
  name: string
  status: HealthStatus
  lastCheckTime: number
  consecutiveFailures: number
  errorRate: number
  latency: {
    p50: number
    p95: number
    p99: number
  }
  circuitBreakerStats?: CircuitBreakerStats
  metadata?: Record<string, any>
}

export interface HealthCheckResult {
  success: boolean
  message?: string
  metadata?: Record<string, any>
}

export type HealthCheckFunction = () => Promise<HealthCheckResult>

export interface HealthMonitorOptions {
  checkIntervalMs?: number
  degradedThreshold?: number
  unhealthyThreshold?: number
  windowSizeMs?: number
}

interface MetricWindow {
  timestamp: number
  success: boolean
  duration: number
}

export class HealthMonitor extends EventEmitter {
  private components = new Map<string, {
    check: HealthCheckFunction
    health: ComponentHealth
    metrics: MetricWindow[]
  }>()
  
  private checkInterval?: NodeJS.Timeout
  private readonly options: Required<HealthMonitorOptions>

  constructor(options: HealthMonitorOptions = {}) {
    super()
    this.options = {
      checkIntervalMs: options.checkIntervalMs ?? 30000, // 30 seconds
      degradedThreshold: options.degradedThreshold ?? 0.8, // 80% success rate
      unhealthyThreshold: options.unhealthyThreshold ?? 0.5, // 50% success rate
      windowSizeMs: options.windowSizeMs ?? 300000, // 5 minutes
    }
  }

  registerComponent(name: string, check: HealthCheckFunction): void {
    this.components.set(name, {
      check,
      health: {
        name,
        status: HealthStatus.HEALTHY,
        lastCheckTime: Date.now(),
        consecutiveFailures: 0,
        errorRate: 0,
        latency: { p50: 0, p95: 0, p99: 0 },
      },
      metrics: [],
    })

    lgg.info(`[HealthMonitor] Registered component: ${name}`)
  }

  async checkComponent(name: string): Promise<ComponentHealth | null> {
    const component = this.components.get(name)
    if (!component) return null

    const startTime = Date.now()
    
    try {
      const result = await component.check()
      const duration = Date.now() - startTime

      // record metric
      this.recordMetric(name, true, duration)

      if (result.success) {
        component.health.consecutiveFailures = 0
        component.health.metadata = result.metadata
      } else {
        component.health.consecutiveFailures++
        lgg.warn(`[HealthMonitor] Component ${name} check failed: ${result.message}`)
      }

      // update health status
      this.updateComponentStatus(name)
      
    } catch (error) {
      const duration = Date.now() - startTime
      this.recordMetric(name, false, duration)
      
      component.health.consecutiveFailures++
      lgg.error(`[HealthMonitor] Component ${name} check error: ${(error as Error).message}`)
      
      this.updateComponentStatus(name)
    }

    component.health.lastCheckTime = Date.now()
    
    // get circuit breaker stats if available
    const breaker = CircuitBreakerFactory.get(name)
    if (breaker) {
      component.health.circuitBreakerStats = breaker.getStats()
    }

    return component.health
  }

  private recordMetric(name: string, success: boolean, duration: number): void {
    const component = this.components.get(name)
    if (!component) return

    const now = Date.now()
    const window = now - this.options.windowSizeMs

    // add new metric
    component.metrics.push({ timestamp: now, success, duration })

    // clean old metrics
    component.metrics = component.metrics.filter(m => m.timestamp > window)

    // calculate stats
    const successCount = component.metrics.filter(m => m.success).length
    const totalCount = component.metrics.length
    component.health.errorRate = totalCount > 0 ? 1 - (successCount / totalCount) : 0

    // calculate latency percentiles
    const durations = component.metrics.map(m => m.duration).sort((a, b) => a - b)
    if (durations.length > 0) {
      component.health.latency = {
        p50: durations[Math.floor(durations.length * 0.5)],
        p95: durations[Math.floor(durations.length * 0.95)],
        p99: durations[Math.floor(durations.length * 0.99)],
      }
    }
  }

  private updateComponentStatus(name: string): void {
    const component = this.components.get(name)
    if (!component) return

    const oldStatus = component.health.status
    const successRate = 1 - component.health.errorRate

    if (successRate >= this.options.degradedThreshold) {
      component.health.status = HealthStatus.HEALTHY
    } else if (successRate >= this.options.unhealthyThreshold) {
      component.health.status = HealthStatus.DEGRADED
    } else {
      component.health.status = HealthStatus.UNHEALTHY
    }

    // emit event if status changed
    if (oldStatus !== component.health.status) {
      lgg.info(
        `[HealthMonitor] Component ${name} status changed: ${oldStatus} -> ${component.health.status}`
      )
      this.emit("statusChange", name, oldStatus, component.health.status)
    }
  }

  async checkAll(): Promise<Map<string, ComponentHealth>> {
    const results = new Map<string, ComponentHealth>()
    
    // run all checks in parallel
    const checks = Array.from(this.components.keys()).map(async name => {
      const health = await this.checkComponent(name)
      if (health) results.set(name, health)
    })

    await Promise.all(checks)
    return results
  }

  getComponentHealth(name: string): ComponentHealth | null {
    return this.components.get(name)?.health ?? null
  }

  getAllHealth(): Map<string, ComponentHealth> {
    const results = new Map<string, ComponentHealth>()
    this.components.forEach((component, name) => {
      results.set(name, component.health)
    })
    return results
  }

  getOverallStatus(): HealthStatus {
    const healths = Array.from(this.components.values()).map(c => c.health)
    
    if (healths.some(h => h.status === HealthStatus.UNHEALTHY)) {
      return HealthStatus.UNHEALTHY
    }
    if (healths.some(h => h.status === HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED
    }
    return HealthStatus.HEALTHY
  }

  startMonitoring(): void {
    if (this.checkInterval) return

    lgg.info(`[HealthMonitor] Starting health monitoring every ${this.options.checkIntervalMs}ms`)
    
    // initial check
    this.checkAll().catch(err => 
      lgg.error(`[HealthMonitor] Initial health check failed: ${err}`)
    )

    // periodic checks
    this.checkInterval = setInterval(() => {
      this.checkAll().catch(err => 
        lgg.error(`[HealthMonitor] Periodic health check failed: ${err}`)
      )
    }, this.options.checkIntervalMs)
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = undefined
      lgg.info("[HealthMonitor] Stopped health monitoring")
    }
  }

  // predefined health checks
  static createAPIHealthCheck(
    name: string,
    url: string,
    expectedStatus = 200
  ): HealthCheckFunction {
    return async () => {
      try {
        const response = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        })
        
        return {
          success: response.status === expectedStatus,
          message: response.status !== expectedStatus 
            ? `Expected status ${expectedStatus}, got ${response.status}`
            : undefined,
          metadata: { status: response.status },
        }
      } catch (error) {
        return {
          success: false,
          message: (error as Error).message,
        }
      }
    }
  }

  static createDatabaseHealthCheck(
    name: string,
    queryFn: () => Promise<any>
  ): HealthCheckFunction {
    return async () => {
      try {
        const startTime = Date.now()
        await queryFn()
        const duration = Date.now() - startTime
        
        return {
          success: true,
          metadata: { queryTimeMs: duration },
        }
      } catch (error) {
        return {
          success: false,
          message: (error as Error).message,
        }
      }
    }
  }
}

// global health monitor instance
export const globalHealthMonitor = new HealthMonitor()

// export convenience functions
export function registerHealthCheck(name: string, check: HealthCheckFunction): void {
  globalHealthMonitor.registerComponent(name, check)
}

export function getHealthStatus(): Map<string, ComponentHealth> {
  return globalHealthMonitor.getAllHealth()
}

export function startHealthMonitoring(): void {
  globalHealthMonitor.startMonitoring()
}

export function stopHealthMonitoring(): void {
  globalHealthMonitor.stopMonitoring()
}