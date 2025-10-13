import Redis from "ioredis"

/**
 * Redis client configuration for workflow state management.
 *
 * Uses a singleton pattern with connection pooling for performance.
 * Supports graceful degradation if Redis is unavailable.
 */

let redisClient: Redis | null = null
let isRedisEnabled = false
let connectionAttempted = false
let connectionFailed = false

// Track connection attempts to prevent infinite retries
let connectionAttempts = 0
const MAX_CONNECTION_ATTEMPTS = 3

/**
 * Initialize Redis client with retry logic and error handling.
 * Only attempts connection once to avoid repeated failures.
 */
function createRedisClient(): Redis | null {
  const host = process.env.REDIS_HOST
  const port = Number.parseInt(process.env.REDIS_PORT || "6379", 10)
  const password = process.env.REDIS_PASSWORD

  if (!host || !password) {
    console.warn("[Redis] Missing REDIS_HOST or REDIS_PASSWORD, using in-memory fallback")
    connectionFailed = true
    return null
  }

  console.log(`[Redis] Attempting connection to ${host}:${port}...`)

  try {
    const client = new Redis({
      host,
      port,
      password,
      // Limit retry attempts to avoid indefinite reconnection
      retryStrategy(times) {
        connectionAttempts++

        if (times > MAX_CONNECTION_ATTEMPTS) {
          console.error(`[Redis] Max connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached, giving up`)
          connectionFailed = true
          isRedisEnabled = false
          return null // Stop retrying
        }

        const delay = Math.min(times * 500, 2000)
        console.log(`[Redis] Reconnection attempt ${times}/${MAX_CONNECTION_ATTEMPTS}, delay: ${delay}ms`)
        return delay
      },
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      // Shorter timeouts for faster failure detection
      connectTimeout: 5000, // 5s
      commandTimeout: 3000, // 3s per command
      // Keepalive
      keepAlive: 30000, // 30s
      lazyConnect: false, // Connect immediately
      // Fail fast - don't queue commands if not connected
      enableOfflineQueue: false,
    })

    // Event handlers
    client.on("connect", () => {
      console.log(`[Redis] ✓ Connected to ${host}:${port}`)
      isRedisEnabled = true
      connectionFailed = false
      connectionAttempts = 0
    })

    client.on("ready", () => {
      console.log("[Redis] ✓ Client ready for commands")
    })

    client.on("error", error => {
      // Suppress noisy timeout errors once we know connection failed
      if (!connectionFailed) {
        console.error(`[Redis] Connection error: ${error.message}`)
      }
      isRedisEnabled = false
    })

    client.on("close", () => {
      if (!connectionFailed) {
        console.warn("[Redis] Connection closed, will use in-memory fallback")
      }
      isRedisEnabled = false
    })

    client.on("reconnecting", () => {
      if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
        console.log("[Redis] Reconnecting...")
      }
    })

    return client
  } catch (error) {
    console.error("[Redis] Failed to create client:", error)
    connectionFailed = true
    return null
  }
}

/**
 * Get the Redis client singleton.
 * Returns null if Redis is unavailable (caller should fall back to in-memory).
 */
export function getRedisClient(): Redis | null {
  if (!connectionAttempted) {
    connectionAttempted = true
    redisClient = createRedisClient()
  }
  return isRedisEnabled ? redisClient : null
}

/**
 * Check if Redis is currently available and healthy.
 */
export function isRedisAvailable(): boolean {
  return isRedisEnabled && redisClient !== null && redisClient.status === "ready"
}

/**
 * Gracefully close the Redis connection (for shutdown).
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    isRedisEnabled = false
    console.log("[Redis] Connection closed gracefully")
  }
}
