import { type Result, createCredentialError, err, ok } from "@core/utils/config/credential-errors"
import { envi } from "@core/utils/env.mjs"
import Mem0 from "mem0ai"

let mem0Client: Mem0 | null = null
let clientInitializationAttempted = false

/**
 * Get Mem0 client instance or null if not configured.
 * This function does not throw - check return value for null.
 */
export function getMem0Client(): Mem0 | null {
  if (mem0Client) return mem0Client

  if (clientInitializationAttempted) return null

  clientInitializationAttempted = true
  const apiKey = envi.MEM0_API_KEY

  if (!apiKey) {
    console.warn("MEM0_API_KEY not configured. Enhanced memory features disabled.")
    return null
  }

  try {
    mem0Client = new Mem0({ apiKey })
    return mem0Client
  } catch (error) {
    console.error("Failed to initialize Mem0 client:", error)
    return null
  }
}

/**
 * Check if Mem0 service is available.
 */
export function isMem0Available(): boolean {
  return getMem0Client() !== null
}

/**
 * Add memory entry with graceful degradation.
 */
export async function addMemory(message: string, runId: string): Promise<Result<any>> {
  const client = getMem0Client()

  if (!client) {
    return err(createCredentialError("MEM0_API_KEY"))
  }

  try {
    const result = await client.add([{ role: "user", content: message }], { run_id: runId })
    return ok(result)
  } catch (error) {
    return err(createCredentialError("MEM0_API_KEY", "SERVICE_UNAVAILABLE", (error as Error).message))
  }
}

/**
 * Get memories with graceful degradation.
 */
export async function getMemories(query: string, runId?: string, limit?: number): Promise<Result<any[]>> {
  const client = getMem0Client()

  if (!client) {
    return err(createCredentialError("MEM0_API_KEY"))
  }

  try {
    const results = await client.search(query, {
      run_id: runId,
      limit: limit,
    })
    return ok(results)
  } catch (error) {
    return err(createCredentialError("MEM0_API_KEY", "SERVICE_UNAVAILABLE", (error as Error).message))
  }
}

/**
 * Delete memory with graceful degradation.
 */
export async function deleteMemory(memoryId: string): Promise<Result<void>> {
  const client = getMem0Client()

  if (!client) {
    return err(createCredentialError("MEM0_API_KEY"))
  }

  try {
    await client.delete(memoryId)
    return ok(undefined)
  } catch (error) {
    return err(createCredentialError("MEM0_API_KEY", "SERVICE_UNAVAILABLE", (error as Error).message))
  }
}

/**
 * Get all memories with graceful degradation.
 */
export async function getAllMemories(runId?: string): Promise<Result<any[]>> {
  const client = getMem0Client()

  if (!client) {
    return err(createCredentialError("MEM0_API_KEY"))
  }

  try {
    const results = await client.getAll({ run_id: runId })
    return ok(results)
  } catch (error) {
    return err(createCredentialError("MEM0_API_KEY", "SERVICE_UNAVAILABLE", (error as Error).message))
  }
}

/**
 * Reset client for testing.
 * @internal
 */
export function resetMem0Client(): void {
  mem0Client = null
  clientInitializationAttempted = false
}
