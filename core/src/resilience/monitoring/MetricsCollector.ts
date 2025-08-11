import { lgg } from "@core/utils/logging/Logger"
import { EventEmitter } from "events"
import { CircuitBreakerFactory } from "../CircuitBreaker"
import { globalHealthMonitor, type ComponentHealth } from "../HealthMonitor"

export interface Metric {
  name: string
  type: "counter" | "gauge" | "histogram"
  value: number
  labels?: Record<string, string>
  timestamp: number
}

export interface MetricSummary {
  count: number
  sum: number
  min: number
  max: number
  avg: number
  p50: number
  p95: number
  p99: number
}

export interface SystemMetrics {
  timestamp: number

  // workflow metrics
  workflows: {
    total: number
    active: number
    completed: number
    failed: number
    checkpointed: number
    resumedFromCheckpoint: number
  }

  // node metrics
  nodes: {
    invocations: number
    successes: number
    failures: number
    avgDuration: number
    circuitBreakerOpen: number
  }

  // resilience metrics
  resilience: {
    retriesTotal: number
    retriesSuccessful: number
    circuitBreakersOpen: number
    circuitBreakersClosed: number
    circuitBreakersHalfOpen: number
    deadLetterQueueSize: number
  }

  // performance metrics
  performance: {
    avgWorkflowDuration: number
    avgNodeDuration: number
    totalCost: number
    throughput: number // workflows per minute
  }

  // health metrics
  health: {
    overallStatus: string
    healthyComponents: number
    degradedComponents: number
    unhealthyComponents: number
    componentStatuses: Map<string, ComponentHealth>
  }
}

export class MetricsCollector extends EventEmitter {
  private metrics: Map<string, Metric[]> = new Map()
  private systemMetrics: SystemMetrics
  private collectionInterval?: NodeJS.Timeout
  private retentionMs: number = 3600000 // 1 hour default

  constructor() {
    super()
    this.systemMetrics = this.createEmptySystemMetrics()
  }

  // record a metric
  record(metric: Omit<Metric, "timestamp">): void {
    const fullMetric: Metric = {
      ...metric,
      timestamp: Date.now(),
    }

    const key = this.getMetricKey(metric)
    if (!this.metrics.has(key)) {
      this.metrics.set(key, [])
    }

    this.metrics.get(key)!.push(fullMetric)
    this.emit("metric", fullMetric)

    // clean old metrics
    this.cleanOldMetrics(key)
  }

  // convenience methods
  incrementCounter(name: string, labels?: Record<string, string>): void {
    this.record({
      name,
      type: "counter",
      value: 1,
      labels,
    })
  }

  recordGauge(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    this.record({
      name,
      type: "gauge",
      value,
      labels,
    })
  }

  recordDuration(
    name: string,
    durationMs: number,
    labels?: Record<string, string>
  ): void {
    this.record({
      name,
      type: "histogram",
      value: durationMs,
      labels,
    })
  }

  // get metric summary
  getMetricSummary(
    name: string,
    labels?: Record<string, string>
  ): MetricSummary | null {
    const key = this.getMetricKey({ name, labels })
    const metrics = this.metrics.get(key)

    if (!metrics || metrics.length === 0) return null

    const values = metrics.map((m) => m.value).sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)

    return {
      count: values.length,
      sum,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    }
  }

  // collect system-wide metrics
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const metrics = this.createEmptySystemMetrics()
    metrics.timestamp = Date.now()

    // collect circuit breaker stats
    const cbStats = CircuitBreakerFactory.getAllStats()
    Object.values(cbStats).forEach((stat) => {
      if (stat.state === "OPEN") metrics.resilience.circuitBreakersOpen++
      else if (stat.state === "CLOSED")
        metrics.resilience.circuitBreakersClosed++
      else if (stat.state === "HALF_OPEN")
        metrics.resilience.circuitBreakersHalfOpen++
    })

    // collect health stats
    const healthStatuses = globalHealthMonitor.getAllHealth()
    metrics.health.componentStatuses = healthStatuses
    metrics.health.overallStatus = globalHealthMonitor.getOverallStatus()

    healthStatuses.forEach((health) => {
      if (health.status === "HEALTHY") metrics.health.healthyComponents++
      else if (health.status === "DEGRADED") metrics.health.degradedComponents++
      else if (health.status === "UNHEALTHY")
        metrics.health.unhealthyComponents++
    })

    // aggregate recorded metrics
    this.aggregateRecordedMetrics(metrics)

    this.systemMetrics = metrics
    this.emit("systemMetrics", metrics)

    return metrics
  }

  // start automatic collection
  startCollection(intervalMs: number = 10000): void {
    if (this.collectionInterval) return

    lgg.info(
      `[MetricsCollector] Starting metrics collection every ${intervalMs}ms`
    )

    // initial collection
    this.collectSystemMetrics().catch((err) =>
      lgg.error(`[MetricsCollector] Collection failed: ${err}`)
    )

    // periodic collection
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics().catch((err) =>
        lgg.error(`[MetricsCollector] Collection failed: ${err}`)
      )
    }, intervalMs)
  }

  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval)
      this.collectionInterval = undefined
      lgg.info("[MetricsCollector] Stopped metrics collection")
    }
  }

  // get current system metrics
  getCurrentMetrics(): SystemMetrics {
    return this.systemMetrics
  }

  // export metrics in prometheus format
  exportPrometheus(): string {
    const lines: string[] = []
    const timestamp = Date.now()

    // workflow metrics
    lines.push("# HELP workflow_total Total number of workflows")
    lines.push("# TYPE workflow_total counter")
    lines.push(
      `workflow_total ${this.systemMetrics.workflows.total} ${timestamp}`
    )

    lines.push("# HELP workflow_active Number of active workflows")
    lines.push("# TYPE workflow_active gauge")
    lines.push(
      `workflow_active ${this.systemMetrics.workflows.active} ${timestamp}`
    )

    // node metrics
    lines.push("# HELP node_invocations_total Total node invocations")
    lines.push("# TYPE node_invocations_total counter")
    lines.push(
      `node_invocations_total ${this.systemMetrics.nodes.invocations} ${timestamp}`
    )

    lines.push("# HELP node_duration_ms Average node execution duration")
    lines.push("# TYPE node_duration_ms gauge")
    lines.push(
      `node_duration_ms ${this.systemMetrics.nodes.avgDuration} ${timestamp}`
    )

    // resilience metrics
    lines.push("# HELP circuit_breakers_open Number of open circuit breakers")
    lines.push("# TYPE circuit_breakers_open gauge")
    lines.push(
      `circuit_breakers_open ${this.systemMetrics.resilience.circuitBreakersOpen} ${timestamp}`
    )

    lines.push("# HELP retries_total Total retry attempts")
    lines.push("# TYPE retries_total counter")
    lines.push(
      `retries_total ${this.systemMetrics.resilience.retriesTotal} ${timestamp}`
    )

    // health metrics
    lines.push(
      "# HELP health_status Overall system health (1=healthy, 0.5=degraded, 0=unhealthy)"
    )
    lines.push("# TYPE health_status gauge")
    const healthValue =
      this.systemMetrics.health.overallStatus === "HEALTHY"
        ? 1
        : this.systemMetrics.health.overallStatus === "DEGRADED"
          ? 0.5
          : 0
    lines.push(`health_status ${healthValue} ${timestamp}`)

    return lines.join("\n")
  }

  // export metrics as JSON
  exportJSON(): string {
    return JSON.stringify(
      {
        timestamp: Date.now(),
        systemMetrics: this.systemMetrics,
        metricSummaries: this.getAllMetricSummaries(),
      },
      null,
      2
    )
  }

  private getMetricKey(metric: {
    name: string
    labels?: Record<string, string>
  }): string {
    const labelStr = metric.labels
      ? Object.entries(metric.labels)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join(",")
      : ""
    return `${metric.name}${labelStr ? `:${labelStr}` : ""}`
  }

  private cleanOldMetrics(key: string): void {
    const metrics = this.metrics.get(key)
    if (!metrics) return

    const cutoff = Date.now() - this.retentionMs
    const filtered = metrics.filter((m) => m.timestamp > cutoff)

    if (filtered.length < metrics.length) {
      this.metrics.set(key, filtered)
    }
  }

  private createEmptySystemMetrics(): SystemMetrics {
    return {
      timestamp: Date.now(),
      workflows: {
        total: 0,
        active: 0,
        completed: 0,
        failed: 0,
        checkpointed: 0,
        resumedFromCheckpoint: 0,
      },
      nodes: {
        invocations: 0,
        successes: 0,
        failures: 0,
        avgDuration: 0,
        circuitBreakerOpen: 0,
      },
      resilience: {
        retriesTotal: 0,
        retriesSuccessful: 0,
        circuitBreakersOpen: 0,
        circuitBreakersClosed: 0,
        circuitBreakersHalfOpen: 0,
        deadLetterQueueSize: 0,
      },
      performance: {
        avgWorkflowDuration: 0,
        avgNodeDuration: 0,
        totalCost: 0,
        throughput: 0,
      },
      health: {
        overallStatus: "HEALTHY",
        healthyComponents: 0,
        degradedComponents: 0,
        unhealthyComponents: 0,
        componentStatuses: new Map(),
      },
    }
  }

  private aggregateRecordedMetrics(metrics: SystemMetrics): void {
    // aggregate workflow metrics
    const workflowTotal = this.getMetricValue("workflow.total")
    if (workflowTotal) metrics.workflows.total = workflowTotal

    const workflowActive = this.getMetricValue("workflow.active")
    if (workflowActive) metrics.workflows.active = workflowActive

    // aggregate node metrics
    const nodeInvocations = this.getMetricValue("node.invocations")
    if (nodeInvocations) metrics.nodes.invocations = nodeInvocations

    const nodeDurationSummary = this.getMetricSummary("node.duration")
    if (nodeDurationSummary) metrics.nodes.avgDuration = nodeDurationSummary.avg

    // aggregate resilience metrics
    const retriesTotal = this.getMetricValue("retries.total")
    if (retriesTotal) metrics.resilience.retriesTotal = retriesTotal

    // calculate throughput
    const completedInWindow = this.getMetricCount("workflow.completed", 60000) // last minute
    metrics.performance.throughput = completedInWindow
  }

  private getMetricValue(name: string): number | null {
    const key = this.getMetricKey({ name })
    const metrics = this.metrics.get(key)
    if (!metrics || metrics.length === 0) return null
    return metrics.reduce((sum, m) => sum + m.value, 0)
  }

  private getMetricCount(name: string, windowMs: number): number {
    const key = this.getMetricKey({ name })
    const metrics = this.metrics.get(key)
    if (!metrics) return 0

    const cutoff = Date.now() - windowMs
    return metrics.filter((m) => m.timestamp > cutoff).length
  }

  private getAllMetricSummaries(): Record<string, MetricSummary> {
    const summaries: Record<string, MetricSummary> = {}

    this.metrics.forEach((_, key) => {
      const parts = key.split(":")
      const name = parts[0]
      const labels = parts[1]
        ? Object.fromEntries(parts[1].split(",").map((pair) => pair.split("=")))
        : undefined

      const summary = this.getMetricSummary(name, labels)
      if (summary) {
        summaries[key] = summary
      }
    })

    return summaries
  }
}

// global metrics collector instance
export const globalMetricsCollector = new MetricsCollector()

// convenience functions
export function recordWorkflowStart(workflowId: string): void {
  globalMetricsCollector.incrementCounter("workflow.started", {
    id: workflowId,
  })
  globalMetricsCollector.recordGauge("workflow.active", 1)
}

export function recordWorkflowComplete(
  workflowId: string,
  durationMs: number,
  cost: number
): void {
  globalMetricsCollector.incrementCounter("workflow.completed", {
    id: workflowId,
  })
  globalMetricsCollector.recordGauge("workflow.active", -1)
  globalMetricsCollector.recordDuration("workflow.duration", durationMs)
  globalMetricsCollector.recordGauge("workflow.cost", cost)
}

export function recordNodeInvocation(
  nodeId: string,
  success: boolean,
  durationMs: number
): void {
  globalMetricsCollector.incrementCounter("node.invocations", { node: nodeId })
  if (success) {
    globalMetricsCollector.incrementCounter("node.successes", { node: nodeId })
  } else {
    globalMetricsCollector.incrementCounter("node.failures", { node: nodeId })
  }
  globalMetricsCollector.recordDuration("node.duration", durationMs, {
    node: nodeId,
  })
}

export function recordRetry(
  operation: string,
  attempt: number,
  success: boolean
): void {
  globalMetricsCollector.incrementCounter("retries.total", {
    operation,
    attempt: attempt.toString(),
  })
  if (success) {
    globalMetricsCollector.incrementCounter("retries.successful", { operation })
  }
}
