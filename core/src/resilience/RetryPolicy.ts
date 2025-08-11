import { lgg } from "@core/utils/logging/Logger"

export interface RetryOptions {
  maxAttempts: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  jitterFactor?: number
  retryableErrors?: (error: Error) => boolean
  onRetry?: (attempt: number, error: Error, delayMs: number) => void
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
  totalDuration: number
}

export class RetryPolicy {
  private readonly options: Required<Omit<RetryOptions, "retryableErrors" | "onRetry">> & 
    Pick<RetryOptions, "retryableErrors" | "onRetry">

  constructor(options: RetryOptions) {
    this.options = {
      maxAttempts: options.maxAttempts,
      initialDelayMs: options.initialDelayMs ?? 100,
      maxDelayMs: options.maxDelayMs ?? 30000,
      backoffMultiplier: options.backoffMultiplier ?? 2,
      jitterFactor: options.jitterFactor ?? 0.1,
      retryableErrors: options.retryableErrors,
      onRetry: options.onRetry,
    }
  }

  async execute<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<RetryResult<T>> {
    const startTime = Date.now()
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        const data = await operation()
        return {
          success: true,
          data,
          attempts: attempt,
          totalDuration: Date.now() - startTime,
        }
      } catch (error) {
        lastError = error as Error

        // check if error is retryable
        if (this.options.retryableErrors && !this.options.retryableErrors(lastError)) {
          lgg.warn(
            `[RetryPolicy${context ? `:${context}` : ""}] Non-retryable error on attempt ${attempt}: ${lastError.message}`
          )
          break
        }

        if (attempt < this.options.maxAttempts) {
          const delayMs = this.calculateDelay(attempt)
          
          lgg.info(
            `[RetryPolicy${context ? `:${context}` : ""}] Attempt ${attempt} failed, retrying in ${delayMs}ms: ${lastError.message}`
          )

          this.options.onRetry?.(attempt, lastError, delayMs)
          
          await this.sleep(delayMs)
        } else {
          lgg.error(
            `[RetryPolicy${context ? `:${context}` : ""}] All ${this.options.maxAttempts} attempts failed: ${lastError.message}`
          )
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: this.options.maxAttempts,
      totalDuration: Date.now() - startTime,
    }
  }

  private calculateDelay(attempt: number): number {
    // exponential backoff: initialDelay * (multiplier ^ (attempt - 1))
    const exponentialDelay = 
      this.options.initialDelayMs * 
      Math.pow(this.options.backoffMultiplier, attempt - 1)

    // cap at max delay
    const cappedDelay = Math.min(exponentialDelay, this.options.maxDelayMs)

    // add jitter to prevent thundering herd
    const jitter = cappedDelay * this.options.jitterFactor * (Math.random() * 2 - 1)
    
    return Math.round(cappedDelay + jitter)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// common retry policies
export class RetryPolicies {
  static readonly immediate = new RetryPolicy({
    maxAttempts: 3,
    initialDelayMs: 0,
    maxDelayMs: 0,
    backoffMultiplier: 1,
  })

  static readonly exponential = new RetryPolicy({
    maxAttempts: 5,
    initialDelayMs: 100,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  })

  static readonly aggressive = new RetryPolicy({
    maxAttempts: 10,
    initialDelayMs: 50,
    maxDelayMs: 30000,
    backoffMultiplier: 1.5,
    jitterFactor: 0.2,
  })

  static readonly networkErrors = new RetryPolicy({
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
    retryableErrors: (error) => {
      // retry on network errors, timeouts, and 5xx errors
      const message = error.message.toLowerCase()
      return (
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("econnrefused") ||
        message.includes("enotfound") ||
        message.includes("etimedout") ||
        message.includes("socket hang up") ||
        (error.message.match(/status: (5\d{2})/) !== null)
      )
    },
  })

  static readonly apiRateLimit = new RetryPolicy({
    maxAttempts: 5,
    initialDelayMs: 5000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    jitterFactor: 0.3,
    retryableErrors: (error) => {
      const message = error.message.toLowerCase()
      return (
        message.includes("rate limit") ||
        message.includes("429") ||
        message.includes("too many requests")
      )
    },
  })

  static custom(options: RetryOptions): RetryPolicy {
    return new RetryPolicy(options)
  }
}