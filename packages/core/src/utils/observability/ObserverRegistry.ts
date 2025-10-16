/**
 * ObserverRegistry - Global registry for agent observers
 *
 * Maps randomId → AgentObserver for workflow execution tracking.
 * Handles observer lifecycle (registration, retrieval, disposal).
 */

import type { AgentObserver } from "./AgentObserver"

export class ObserverRegistry {
  private static instance: ObserverRegistry | null = null
  private observers = new Map<string, AgentObserver>()

  private constructor() {}

  static getInstance(): ObserverRegistry {
    if (!ObserverRegistry.instance) {
      ObserverRegistry.instance = new ObserverRegistry()
    }
    return ObserverRegistry.instance
  }

  /**
   * Register an existing observer
   */
  register(randomId: string, observer: AgentObserver): void {
    this.observers.set(randomId, observer)
  }

  /**
   * Get an observer by randomId
   */
  get(randomId: string): AgentObserver | undefined {
    return this.observers.get(randomId)
  }

  /**
   * Remove observer from registry (caller responsible for disposing observer)
   */
  dispose(randomId: string): void {
    this.observers.delete(randomId)
  }

  /**
   * Get count of active observers (for monitoring)
   */
  getActiveCount(): number {
    return this.observers.size
  }

  /**
   * Get all observer IDs (for debugging)
   */
  getActiveIds(): string[] {
    return Array.from(this.observers.keys())
  }
}
