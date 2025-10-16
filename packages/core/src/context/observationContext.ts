import { AsyncLocalStorage } from "node:async_hooks"
import type { AgentObserver } from "../utils/observability/AgentObserver"

/**
 * Observation context for agent execution streaming.
 * Separate from ExecutionContext to keep concerns isolated.
 */
export type ObservationContext = {
  randomId: string
  observer: AgentObserver
}

const observationContextStore = new AsyncLocalStorage<ObservationContext>()

export function withObservationContext<T>(ctx: ObservationContext, fn: () => Promise<T>): Promise<T> {
  return observationContextStore.run(ctx, fn)
}

export function getObservationContext(): ObservationContext | undefined {
  return observationContextStore.getStore()
}

export function requireObservationContext(): ObservationContext {
  const ctx = getObservationContext()
  if (!ctx) {
    throw new Error("No observation context. Agent streaming must be initialized via API endpoint.")
  }
  return ctx
}
