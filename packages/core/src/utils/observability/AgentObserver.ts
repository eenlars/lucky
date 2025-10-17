/**
 * AgentObserver - Per-workflow execution event collector
 *
 * Collects events from agent execution with ring buffer for reconnection support.
 * Provides live event streaming via subscription pattern.
 */

import type { AgentEvent } from "@lucky/shared"

type EventListener = (event: AgentEvent) => void

export class AgentObserver {
  private events: AgentEvent[] = []
  private listeners: Set<EventListener> = new Set()
  private readonly maxEvents = 1000
  private isActive = true

  /**
   * Emit an event to all subscribers and store in buffer
   */
  emit(event: AgentEvent): void {
    if (!this.isActive) return

    // Add to ring buffer
    this.events.push(event)
    if (this.events.length > this.maxEvents) {
      this.events.shift()
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error("[AgentObserver] Listener error:", error)
      }
    }
  }

  /**
   * Subscribe to live events
   * @returns Unsubscribe function
   */
  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Get buffered events (for backfill on reconnection)
   * @param since - Only return events after this timestamp
   */
  getEvents(since?: number): AgentEvent[] {
    if (since === undefined) {
      return [...this.events]
    }
    return this.events.filter(e => e.timestamp > since)
  }

  /**
   * Mark observer as inactive (no more events will be emitted)
   */
  dispose(): void {
    this.isActive = false
    this.listeners.clear()
  }

  /**
   * Check if observer is still active
   */
  isActiveObserver(): boolean {
    return this.isActive
  }

  /**
   * Get current buffer size
   */
  getEventCount(): number {
    return this.events.length
  }
}
