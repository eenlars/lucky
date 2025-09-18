/**
 * Server-Sent Events sink for real-time observability
 *
 * Broadcasts events to connected clients via SSE streams.
 * Maintains connection registry and handles cleanup.
 */

import type { Sink } from "../obs"

export interface SSEConnection {
  id: string
  controller: ReadableStreamDefaultController<any>
  filters?: EventFilter[]
  metadata?: Record<string, any>
}

export interface EventFilter {
  type: "include" | "exclude"
  patterns: string[]
  attributes?: Record<string, any>
}

/**
 * SSE sink that manages multiple client connections
 * and broadcasts observability events in real-time
 */
export class SSESink implements Sink {
  private connections = new Map<string, SSEConnection>()
  private eventBuffer: any[] = []
  private readonly maxBufferSize: number
  private readonly heartbeatInterval: number
  private heartbeatTimer?: NodeJS.Timeout

  constructor(
    options: {
      maxBufferSize?: number
      heartbeatInterval?: number
    } = {}
  ) {
    this.maxBufferSize = options.maxBufferSize ?? 1000
    this.heartbeatInterval = options.heartbeatInterval ?? 30000

    // Start heartbeat to keep connections alive
    this.startHeartbeat()
  }

  /**
   * Broadcast event to all connected clients
   */
  event(record: any): void {
    // Buffer recent events for new connections
    this.bufferEvent(record)

    // Broadcast to all connections
    for (const [connectionId, connection] of this.connections) {
      try {
        if (this.shouldSendEvent(record, connection)) {
          this.sendEvent(connection, record)
        }
      } catch (error) {
        console.warn(
          `Failed to send event to connection ${connectionId}:`,
          error
        )
        this.removeConnection(connectionId)
      }
    }
  }

  /**
   * Add a new SSE connection
   */
  addConnection(
    connectionId: string,
    controller: ReadableStreamDefaultController<any>,
    options: {
      filters?: EventFilter[]
      metadata?: Record<string, any>
      sendBuffered?: boolean
    } = {}
  ): void {
    const connection: SSEConnection = {
      id: connectionId,
      controller,
      filters: options.filters,
      metadata: options.metadata,
    }

    this.connections.set(connectionId, connection)

    // Send buffered events to new connection if requested
    if (options.sendBuffered !== false) {
      this.sendBufferedEvents(connection)
    }

    console.log(`SSE connection established: ${connectionId}`)
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      try {
        connection.controller.close()
      } catch (error) {
        // Connection may already be closed
      }
      this.connections.delete(connectionId)
      console.log(`SSE connection closed: ${connectionId}`)
    }
  }

  /**
   * Get connection count for monitoring
   */
  getConnectionCount(): number {
    return this.connections.size
  }

  /**
   * Get connection metadata
   */
  getConnections(): Array<Pick<SSEConnection, "id" | "metadata">> {
    return Array.from(this.connections.values()).map((conn) => ({
      id: conn.id,
      metadata: conn.metadata,
    }))
  }

  /**
   * Clean up all connections
   */
  destroy(): void {
    for (const connectionId of this.connections.keys()) {
      this.removeConnection(connectionId)
    }
    this.eventBuffer = []

    // Clear heartbeat timer
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  private bufferEvent(record: any): void {
    this.eventBuffer.push({
      ...record,
      bufferedAt: new Date().toISOString(),
    })

    // Maintain buffer size limit
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer = this.eventBuffer.slice(-this.maxBufferSize)
    }
  }

  private sendBufferedEvents(connection: SSEConnection): void {
    for (const bufferedEvent of this.eventBuffer) {
      if (this.shouldSendEvent(bufferedEvent, connection)) {
        this.sendEvent(connection, bufferedEvent)
      }
    }
  }

  private shouldSendEvent(record: any, connection: SSEConnection): boolean {
    if (!connection.filters || connection.filters.length === 0) {
      return true
    }

    for (const filter of connection.filters) {
      const matches = this.eventMatchesFilter(record, filter)

      if (filter.type === "include" && matches) {
        return true
      }
      if (filter.type === "exclude" && matches) {
        return false
      }
    }

    // Default to include if no include filters matched
    const hasIncludeFilters = connection.filters.some(
      (f) => f.type === "include"
    )
    return !hasIncludeFilters
  }

  private eventMatchesFilter(record: any, filter: EventFilter): boolean {
    // Check event name patterns
    const eventMatches = filter.patterns.some((pattern) => {
      if (pattern.includes("*")) {
        const regex = new RegExp(pattern.replace(/\*/g, ".*"))
        return regex.test(record.event || "")
      }
      return (record.event || "") === pattern
    })

    if (!eventMatches) {
      return false
    }

    // Check attribute filters if specified
    if (filter.attributes) {
      for (const [key, value] of Object.entries(filter.attributes)) {
        if (record[key] !== value) {
          return false
        }
      }
    }

    return true
  }

  private sendEvent(connection: SSEConnection, record: any): void {
    const sseData = `data: ${JSON.stringify(record)}\n\n`
    connection.controller.enqueue(new TextEncoder().encode(sseData))
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const heartbeat = {
        event: "heartbeat",
        ts: new Date().toISOString(),
        connections: this.getConnectionCount(),
      }

      for (const [connectionId, connection] of this.connections) {
        try {
          this.sendEvent(connection, heartbeat)
        } catch (error) {
          this.removeConnection(connectionId)
        }
      }
    }, this.heartbeatInterval)
  }
}

/**
 * Global SSE sink instance
 * Can be configured as needed for different environments
 */
export const globalSSESink = new SSESink()
