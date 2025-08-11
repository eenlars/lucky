import { lgg } from "@core/utils/logging/Logger"
import { EventEmitter } from "events"

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export interface CircuitBreakerOptions {
  name: string
  failureThreshold: number
  successThreshold: number
  timeout: number
  volumeThreshold?: number
  errorFilter?: (error: Error) => boolean
  fallback?: () => Promise<any>
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void
}

export interface CircuitBreakerStats {
  state: CircuitState
  failures: number
  successes: number
  lastFailureTime?: number
  nextAttemptTime?: number
  totalRequests: number
  totalFailures: number
  totalSuccesses: number
  failureRate: number
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED
  private failures = 0
  private successes = 0
  private lastFailureTime?: number
  private nextAttemptTime?: number
  private totalRequests = 0
  private totalFailures = 0
  private totalSuccesses = 0
  private requestTimestamps: number[] = []

  constructor(private options: CircuitBreakerOptions) {
    super()
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < (this.nextAttemptTime ?? 0)) {
        if (this.options.fallback) {
          lgg.warn(`[CircuitBreaker:${this.options.name}] Open - using fallback`)
          return this.options.fallback()
        }
        throw new Error(`Circuit breaker is OPEN for ${this.options.name}`)
      }
      // transition to half-open
      this.transitionTo(CircuitState.HALF_OPEN)
    }

    this.totalRequests++
    this.requestTimestamps.push(Date.now())
    
    // clean old timestamps (keep last minute)
    const oneMinuteAgo = Date.now() - 60000
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo)

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure(error as Error)
      throw error
    }
  }

  private onSuccess(): void {
    this.totalSuccesses++
    this.failures = 0

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++
      if (this.successes >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED)
      }
    }
  }

  private onFailure(error: Error): void {
    this.totalFailures++
    this.lastFailureTime = Date.now()

    // check if error should be counted
    if (this.options.errorFilter && !this.options.errorFilter(error)) {
      return
    }

    this.failures++
    this.successes = 0

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN)
    } else if (
      this.state === CircuitState.CLOSED &&
      this.failures >= this.options.failureThreshold
    ) {
      // check volume threshold if specified
      const volumeThreshold = this.options.volumeThreshold ?? 1
      if (this.requestTimestamps.length >= volumeThreshold) {
        this.transitionTo(CircuitState.OPEN)
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state
    this.state = newState

    if (newState === CircuitState.OPEN) {
      this.nextAttemptTime = Date.now() + this.options.timeout
      this.failures = 0
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successes = 0
      this.failures = 0
    }

    lgg.info(
      `[CircuitBreaker:${this.options.name}] State transition: ${oldState} -> ${newState}`
    )

    this.emit("stateChange", oldState, newState)
    this.options.onStateChange?.(oldState, newState)
  }

  getStats(): CircuitBreakerStats {
    const failureRate = this.totalRequests > 0
      ? this.totalFailures / this.totalRequests
      : 0

    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      failureRate,
    }
  }

  reset(): void {
    this.state = CircuitState.CLOSED
    this.failures = 0
    this.successes = 0
    this.lastFailureTime = undefined
    this.nextAttemptTime = undefined
    lgg.info(`[CircuitBreaker:${this.options.name}] Reset to CLOSED state`)
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN && Date.now() < (this.nextAttemptTime ?? 0)
  }

  getState(): CircuitState {
    return this.state
  }
}

// circuit breaker factory for managing instances
export class CircuitBreakerFactory {
  private static breakers = new Map<string, CircuitBreaker>()

  static create(options: CircuitBreakerOptions): CircuitBreaker {
    const existing = this.breakers.get(options.name)
    if (existing) {
      return existing
    }

    const breaker = new CircuitBreaker(options)
    this.breakers.set(options.name, breaker)
    return breaker
  }

  static get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name)
  }

  static getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {}
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats()
    })
    return stats
  }

  static reset(name?: string): void {
    if (name) {
      this.breakers.get(name)?.reset()
    } else {
      this.breakers.forEach(breaker => breaker.reset())
    }
  }
}