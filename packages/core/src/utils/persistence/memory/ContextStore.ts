// todo-hierarchyviolation: utils (level 0) importing from tools (level 1) violates hierarchy
import { ContextFileInfo } from "@/tools/context/contextStore.types"
import { InMemoryContextStore } from "@/utils/persistence/memory/MemoryStore"
import { SupabaseContextStore } from "@/utils/persistence/memory/SupabaseStore"

export interface ContextStore {
  get<T>(scope: "workflow" | "node", key: string): Promise<T | undefined>
  set<T>(scope: "workflow" | "node", key: string, value: T): Promise<void>
  list(scope: "workflow" | "node"): Promise<string[]>
  listWithInfo(scope: "workflow" | "node"): Promise<ContextFileInfo[]>
  delete(scope: "workflow" | "node", key: string): Promise<void>
  getSummary(
    scope: "workflow" | "node",
    key: string
  ): Promise<string | undefined>
}

export function createContextStore(
  backend: "memory",
  workflowInvocationId: string
): InMemoryContextStore
export function createContextStore(
  backend: "supabase",
  workflowInvocationId: string
): SupabaseContextStore
export function createContextStore(
  backend: "memory" | "supabase",
  workflowInvocationId: string
): ContextStore {
  if (backend === "memory") {
    return new InMemoryContextStore(workflowInvocationId)
  }
  if (backend === "supabase") {
    return new SupabaseContextStore(workflowInvocationId)
  }
  throw new Error(`Invalid backend: ${backend}`)
}
