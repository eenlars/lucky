import { lgg } from "@core/utils/logging/Logger"
import { CircuitBreaker, CircuitBreakerFactory, type CircuitBreakerOptions } from "./CircuitBreaker"
import { RetryPolicy, type RetryOptions } from "./RetryPolicy"

export interface ResilientExecutorOptions {
  name: string
  retry?: RetryOptions
  circuitBreaker?: Omit<CircuitBreakerOptions, "name">
  timeout?: number
  fallback?: () => Promise<any>
  onExecute?: (name: string) => void
  onSuccess?: (name: string, duration: number) => void
  onFailure?: (name: string, error: Error, duration: number) => void
}

export interface ExecutionResult<T> {
  success: boolean
  data?: T
  error?: Error
  duration: number
  attempts?: number
  circuitBreakerState?: string
  fallbackUsed?: boolean
}

export class ResilientExecutor<T = any> {
  private readonly retryPolicy?: RetryPolicy
  private readonly circuitBreaker?: CircuitBreaker
  private readonly options: ResilientExecutorOptions

  constructor(options: ResilientExecutorOptions) {
    this.options = options

    // initialize retry policy if configured
    if (options.retry) {
      this.retryPolicy = new RetryPolicy(options.retry)
    }

    // initialize circuit breaker if configured
    if (options.circuitBreaker) {
      this.circuitBreaker = CircuitBreakerFactory.create({
        name: options.name,
        ...options.circuitBreaker,
        fallback: options.fallback,
      })
    }
  }

  async execute(operation: () => Promise<T>): Promise<ExecutionResult<T>> {
    const startTime = Date.now()
    this.options.onExecute?.(this.options.name)

    try {
      // wrap operation with timeout if configured
      const timedOperation = this.options.timeout
        ? this.withTimeout(operation, this.options.timeout)
        : operation

      // apply circuit breaker if configured
      const breakerOperation = this.circuitBreaker
        ? () => this.circuitBreaker!.execute(timedOperation)
        : timedOperation

      // apply retry policy if configured
      if (this.retryPolicy) {
        const retryResult = await this.retryPolicy.execute(
          breakerOperation,
          this.options.name
        )

        const duration = Date.now() - startTime

        if (retryResult.success) {
          this.options.onSuccess?.(this.options.name, duration)
          return {
            success: true,
            data: retryResult.data,
            duration,
            attempts: retryResult.attempts,
            circuitBreakerState: this.circuitBreaker?.getState(),
          }
        } else {
          this.options.onFailure?.(this.options.name, retryResult.error!, duration)
          
          // try fallback if available
          if (this.options.fallback) {
            try {
              const fallbackData = await this.options.fallback()
              return {
                success: true,
                data: fallbackData,
                duration: Date.now() - startTime,
                attempts: retryResult.attempts,
                circuitBreakerState: this.circuitBreaker?.getState(),
                fallbackUsed: true,
              }
            } catch (fallbackError) {
              lgg.error(
                `[ResilientExecutor:${this.options.name}] Fallback also failed: ${(fallbackError as Error).message}`
              )
            }
          }

          return {
            success: false,
            error: retryResult.error,
            duration,
            attempts: retryResult.attempts,
            circuitBreakerState: this.circuitBreaker?.getState(),
          }
        }
      } else {
        // no retry policy, execute directly
        const data = await breakerOperation()
        const duration = Date.now() - startTime
        
        this.options.onSuccess?.(this.options.name, duration)
        
        return {
          success: true,
          data,
          duration,
          circuitBreakerState: this.circuitBreaker?.getState(),
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const err = error as Error
      
      this.options.onFailure?.(this.options.name, err, duration)

      // try fallback if available
      if (this.options.fallback && !err.message.includes("Circuit breaker is OPEN")) {
        try {
          const fallbackData = await this.options.fallback()
          return {
            success: true,
            data: fallbackData,
            duration: Date.now() - startTime,
            circuitBreakerState: this.circuitBreaker?.getState(),
            fallbackUsed: true,
          }
        } catch (fallbackError) {
          lgg.error(
            `[ResilientExecutor:${this.options.name}] Fallback also failed: ${(fallbackError as Error).message}`
          )
        }
      }

      return {
        success: false,
        error: err,
        duration,
        circuitBreakerState: this.circuitBreaker?.getState(),
      }
    }
  }

  private withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): () => Promise<T> {
    return () => {
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`))
        }, timeoutMs)

        operation()
          .then(result => {
            clearTimeout(timer)
            resolve(result)
          })
          .catch(error => {
            clearTimeout(timer)
            reject(error)
          })
      })
    }
  }

  getCircuitBreakerStats() {
    return this.circuitBreaker?.getStats()
  }
}

// factory for creating resilient executors with common configurations
export class ResilientExecutorFactory {
  static forAPI(name: string, fallback?: () => Promise<any>): ResilientExecutor {
    return new ResilientExecutor({
      name,
      retry: {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
        retryableErrors: (error) => {
          const message = error.message.toLowerCase()
          return (
            message.includes("network") ||
            message.includes("timeout") ||
            message.includes("rate limit") ||
            message.includes("429") ||
            message.includes("5") // 5xx errors
          )
        },
      },
      circuitBreaker: {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 30000,
        volumeThreshold: 10,
      },
      timeout: 30000,
      fallback,
    })
  }

  static forDatabase(name: string): ResilientExecutor {
    return new ResilientExecutor({
      name,
      retry: {
        maxAttempts: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        retryableErrors: (error) => {
          const message = error.message.toLowerCase()
          return (
            message.includes("connection") ||
            message.includes("timeout") ||
            message.includes("deadlock")
          )
        },
      },
      circuitBreaker: {
        failureThreshold: 10,
        successThreshold: 3,
        timeout: 10000,
      },
      timeout: 5000,
    })
  }

  static forFileSystem(name: string): ResilientExecutor {
    return new ResilientExecutor({
      name,
      retry: {
        maxAttempts: 3,
        initialDelayMs: 50,
        maxDelayMs: 500,
        backoffMultiplier: 2,
        retryableErrors: (error) => {
          const message = error.message.toLowerCase()
          return (
            message.includes("enoent") ||
            message.includes("eacces") ||
            message.includes("emfile") ||
            message.includes("busy")
          )
        },
      },
      timeout: 10000,
    })
  }

  static forWorkflowNode(nodeId: string, fallback?: () => Promise<any>): ResilientExecutor {
    return new ResilientExecutor({
      name: `node-${nodeId}`,
      retry: {
        maxAttempts: 3,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        jitterFactor: 0.2,
      },
      circuitBreaker: {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 60000,
        volumeThreshold: 5,
        errorFilter: (error) => {
          // don't count user errors or validation errors
          const message = error.message.toLowerCase()
          return !(
            message.includes("validation") ||
            message.includes("invalid input") ||
            message.includes("user error")
          )
        },
      },
      timeout: 120000, // 2 minutes
      fallback,
    })
  }

  static custom(options: ResilientExecutorOptions): ResilientExecutor {
    return new ResilientExecutor(options)
  }
}