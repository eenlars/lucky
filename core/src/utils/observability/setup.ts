/**
 * Observability Setup and Configuration
 *
 * Initializes the observability system with proper sinks
 * and workflow event routing for real-time updates.
 */

import { setSink, TeeSink, StdoutSink, obs } from "./obs"
import { globalSSESink } from "./sinks/SSESink"
import { workflowEvents } from "./events/WorkflowEvents"

/**
 * Initialize observability system with SSE support
 *
 * This should be called once at application startup to ensure
 * workflow events are properly routed to both console and SSE streams.
 */
export function initializeObservability(
  options: {
    enableConsoleLogging?: boolean
    enableSSEStreaming?: boolean
  } = {}
) {
  const { enableConsoleLogging = true, enableSSEStreaming = true } = options

  const sinks = []

  // Add console logging if enabled
  if (enableConsoleLogging) {
    sinks.push(new StdoutSink())
  }

  // Add SSE streaming if enabled
  if (enableSSEStreaming) {
    sinks.push(globalSSESink)
  }

  // Configure the global sink
  if (sinks.length > 1) {
    setSink(new TeeSink(sinks))
  } else if (sinks.length === 1) {
    setSink(sinks[0])
  }

  // Wire workflow events to obs
  obs.setupWorkflowEvents(workflowEvents)

  // Log initialization only if console logging is enabled
  if (enableConsoleLogging) {
    console.log(`[Observability] Initialized with ${sinks.length} sinks`)
  }

  return {
    sseConnectionCount: () => globalSSESink.getConnectionCount(),
    sseConnections: () => globalSSESink.getConnections(),
  }
}

/**
 * Get observability statistics
 */
export function getObservabilityStats() {
  return {
    sseConnections: globalSSESink.getConnectionCount(),
    activeConnections: globalSSESink.getConnections(),
  }
}
