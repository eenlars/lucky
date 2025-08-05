import Mem0 from "mem0ai"

let mem0Client: Mem0 | null = null

export function getMem0Client(): Mem0 | null {
  if (!mem0Client) {
    const apiKey = process.env.MEM0_API_KEY
    if (!apiKey) {
      console.warn(
        "MEM0_API_KEY environment variable not found, memory functionality disabled"
      )
      return null
    }

    mem0Client = new Mem0({
      apiKey: apiKey,
    })
  }

  return mem0Client
}

export async function addMemory(message: string, runId: string): Promise<any> {
  const client = getMem0Client()
  if (!client) return { error: "Memory service unavailable" }
  return await client.add([{ role: "user", content: message }], {
    run_id: runId,
  })
}

export async function getMemories(
  query: string,
  runId?: string,
  limit?: number
): Promise<any[]> {
  const client = getMem0Client()
  if (!client) throw new Error("Memory service unavailable")
  return await client.search(query, {
    run_id: runId,
    limit: limit,
  })
}

export async function updateMemory(
  memoryId: string,
  message: string
): Promise<any> {
  const client = getMem0Client()
  if (!client) throw new Error("Memory service unavailable")
  return await client.update(memoryId, message)
}

export async function deleteMemory(memoryId: string): Promise<void> {
  const client = getMem0Client()
  if (!client) throw new Error("Memory service unavailable")
  await client.delete(memoryId)
}

export async function getAllMemories(runId?: string): Promise<any[]> {
  const client = getMem0Client()
  if (!client) throw new Error("Memory service unavailable")
  return await client.getAll({
    run_id: runId,
  })
}
