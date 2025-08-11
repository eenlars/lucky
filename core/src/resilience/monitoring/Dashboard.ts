import { lgg } from "@core/utils/logging/Logger"
import chalk from "chalk"
import { CircuitBreakerFactory } from "../CircuitBreaker"
import { globalHealthMonitor } from "../HealthMonitor"
import { globalMetricsCollector, type SystemMetrics } from "./MetricsCollector"

export interface DashboardOptions {
  refreshIntervalMs?: number
  showDetails?: boolean
  colorize?: boolean
}

export class ResilienceDashboard {
  private refreshInterval?: NodeJS.Timeout
  private readonly options: Required<DashboardOptions>

  constructor(options: DashboardOptions = {}) {
    this.options = {
      refreshIntervalMs: options.refreshIntervalMs ?? 5000,
      showDetails: options.showDetails ?? true,
      colorize: options.colorize ?? true,
    }
  }

  // render dashboard to console
  render(): void {
    const metrics = globalMetricsCollector.getCurrentMetrics()
    const output = this.formatDashboard(metrics)
    
    // clear console and render
    console.clear()
    console.log(output)
  }

  // get dashboard as string
  getDashboardText(): string {
    const metrics = globalMetricsCollector.getCurrentMetrics()
    return this.formatDashboard(metrics)
  }

  // get dashboard as HTML
  getDashboardHTML(): string {
    const metrics = globalMetricsCollector.getCurrentMetrics()
    return this.formatDashboardHTML(metrics)
  }

  // start auto-refresh
  startAutoRefresh(): void {
    if (this.refreshInterval) return

    lgg.info(`[Dashboard] Starting auto-refresh every ${this.options.refreshIntervalMs}ms`)
    
    // initial render
    this.render()

    // periodic refresh
    this.refreshInterval = setInterval(() => {
      this.render()
    }, this.options.refreshIntervalMs)
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = undefined
      lgg.info("[Dashboard] Stopped auto-refresh")
    }
  }

  private formatDashboard(metrics: SystemMetrics): string {
    const lines: string[] = []
    const c = this.options.colorize ? chalk : {
      green: (s: string) => s,
      yellow: (s: string) => s,
      red: (s: string) => s,
      blue: (s: string) => s,
      cyan: (s: string) => s,
      gray: (s: string) => s,
      bold: (s: string) => s,
    }

    // header
    lines.push(c.bold("\n╔═══════════════════════════════════════════════════════════╗"))
    lines.push(c.bold("║           RESILIENCE FRAMEWORK DASHBOARD                  ║"))
    lines.push(c.bold("╠═══════════════════════════════════════════════════════════╣"))
    
    // timestamp
    lines.push(`║ ${c.gray(new Date(metrics.timestamp).toISOString())}                  ║`)
    lines.push("╠═══════════════════════════════════════════════════════════╣")

    // overall health
    const healthColor = metrics.health.overallStatus === "HEALTHY" ? c.green :
                       metrics.health.overallStatus === "DEGRADED" ? c.yellow : c.red
    lines.push(`║ ${c.bold("SYSTEM HEALTH:")} ${healthColor(metrics.health.overallStatus.padEnd(43))} ║`)
    lines.push("╠═══════════════════════════════════════════════════════════╣")

    // workflow metrics
    lines.push(`║ ${c.bold("WORKFLOWS")}                                                 ║`)
    lines.push(`║   Total:        ${metrics.workflows.total.toString().padStart(10)}                             ║`)
    lines.push(`║   Active:       ${c.cyan(metrics.workflows.active.toString().padStart(10))}                             ║`)
    lines.push(`║   Completed:    ${c.green(metrics.workflows.completed.toString().padStart(10))}                             ║`)
    lines.push(`║   Failed:       ${c.red(metrics.workflows.failed.toString().padStart(10))}                             ║`)
    lines.push(`║   Checkpointed: ${metrics.workflows.checkpointed.toString().padStart(10)}                             ║`)
    lines.push(`║   Resumed:      ${metrics.workflows.resumedFromCheckpoint.toString().padStart(10)}                             ║`)
    lines.push("╠═══════════════════════════════════════════════════════════╣")

    // node metrics
    lines.push(`║ ${c.bold("NODES")}                                                     ║`)
    lines.push(`║   Invocations:  ${metrics.nodes.invocations.toString().padStart(10)}                             ║`)
    lines.push(`║   Success Rate: ${this.formatPercentage(metrics.nodes.successes, metrics.nodes.invocations).padStart(10)}                             ║`)
    lines.push(`║   Avg Duration: ${this.formatDuration(metrics.nodes.avgDuration).padStart(10)}                             ║`)
    lines.push("╠═══════════════════════════════════════════════════════════╣")

    // circuit breakers
    const totalBreakers = metrics.resilience.circuitBreakersOpen + 
                         metrics.resilience.circuitBreakersClosed + 
                         metrics.resilience.circuitBreakersHalfOpen
    lines.push(`║ ${c.bold("CIRCUIT BREAKERS")}                                          ║`)
    lines.push(`║   Total:        ${totalBreakers.toString().padStart(10)}                             ║`)
    lines.push(`║   Open:         ${c.red(metrics.resilience.circuitBreakersOpen.toString().padStart(10))}                             ║`)
    lines.push(`║   Half-Open:    ${c.yellow(metrics.resilience.circuitBreakersHalfOpen.toString().padStart(10))}                             ║`)
    lines.push(`║   Closed:       ${c.green(metrics.resilience.circuitBreakersClosed.toString().padStart(10))}                             ║`)
    lines.push("╠═══════════════════════════════════════════════════════════╣")

    // resilience metrics
    lines.push(`║ ${c.bold("RESILIENCE")}                                                ║`)
    lines.push(`║   Retries:      ${metrics.resilience.retriesTotal.toString().padStart(10)}                             ║`)
    lines.push(`║   Success Rate: ${this.formatPercentage(metrics.resilience.retriesSuccessful, metrics.resilience.retriesTotal).padStart(10)}                             ║`)
    lines.push(`║   DLQ Size:     ${metrics.resilience.deadLetterQueueSize.toString().padStart(10)}                             ║`)
    lines.push("╠═══════════════════════════════════════════════════════════╣")

    // performance
    lines.push(`║ ${c.bold("PERFORMANCE")}                                               ║`)
    lines.push(`║   Throughput:   ${metrics.performance.throughput.toString().padStart(10)} /min                       ║`)
    lines.push(`║   Total Cost:   ${this.formatCost(metrics.performance.totalCost).padStart(10)}                             ║`)
    lines.push("╚═══════════════════════════════════════════════════════════╝")

    // detailed component health if enabled
    if (this.options.showDetails && metrics.health.componentStatuses.size > 0) {
      lines.push("\n" + c.bold("COMPONENT HEALTH:"))
      metrics.health.componentStatuses.forEach((health, name) => {
        const statusColor = health.status === "HEALTHY" ? c.green :
                           health.status === "DEGRADED" ? c.yellow : c.red
        const errorRate = (health.errorRate * 100).toFixed(1)
        lines.push(`  ${name.padEnd(20)} ${statusColor(health.status.padEnd(10))} ` +
                  `Error: ${errorRate}% ` +
                  `P95: ${health.latency.p95}ms`)
      })
    }

    // detailed circuit breaker stats if enabled
    if (this.options.showDetails) {
      const cbStats = CircuitBreakerFactory.getAllStats()
      if (Object.keys(cbStats).length > 0) {
        lines.push("\n" + c.bold("CIRCUIT BREAKERS:"))
        Object.entries(cbStats).forEach(([name, stats]) => {
          const stateColor = stats.state === "CLOSED" ? c.green :
                            stats.state === "HALF_OPEN" ? c.yellow : c.red
          lines.push(`  ${name.padEnd(20)} ${stateColor(stats.state.padEnd(10))} ` +
                    `Fail: ${stats.failures} ` +
                    `Rate: ${(stats.failureRate * 100).toFixed(1)}%`)
        })
      }
    }

    return lines.join("\n")
  }

  private formatDashboardHTML(metrics: SystemMetrics): string {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Resilience Dashboard</title>
  <style>
    body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
    .dashboard { max-width: 800px; margin: 0 auto; }
    .header { background: #2d2d30; padding: 20px; border-radius: 8px 8px 0 0; }
    .section { background: #252526; padding: 15px; border-bottom: 1px solid #3e3e42; }
    .metric { display: flex; justify-content: space-between; margin: 5px 0; }
    .label { color: #9cdcfe; }
    .value { color: #d7ba7d; }
    .healthy { color: #6a9955; }
    .degraded { color: #dcdcaa; }
    .unhealthy { color: #f44747; }
    .timestamp { color: #858585; font-size: 12px; }
    h1 { margin: 0; color: #569cd6; }
    h2 { color: #c586c0; margin: 15px 0 10px 0; font-size: 16px; }
  </style>
  <meta http-equiv="refresh" content="5">
</head>
<body>
  <div class="dashboard">
    <div class="header">
      <h1>Resilience Framework Dashboard</h1>
      <div class="timestamp">${new Date(metrics.timestamp).toISOString()}</div>
    </div>
    
    <div class="section">
      <h2>System Health</h2>
      <div class="metric">
        <span class="label">Overall Status:</span>
        <span class="${metrics.health.overallStatus.toLowerCase()}">${metrics.health.overallStatus}</span>
      </div>
    </div>
    
    <div class="section">
      <h2>Workflows</h2>
      <div class="metric">
        <span class="label">Total:</span>
        <span class="value">${metrics.workflows.total}</span>
      </div>
      <div class="metric">
        <span class="label">Active:</span>
        <span class="value">${metrics.workflows.active}</span>
      </div>
      <div class="metric">
        <span class="label">Success Rate:</span>
        <span class="value">${this.formatPercentage(metrics.workflows.completed, metrics.workflows.total)}</span>
      </div>
    </div>
    
    <div class="section">
      <h2>Circuit Breakers</h2>
      <div class="metric">
        <span class="label">Open:</span>
        <span class="unhealthy">${metrics.resilience.circuitBreakersOpen}</span>
      </div>
      <div class="metric">
        <span class="label">Half-Open:</span>
        <span class="degraded">${metrics.resilience.circuitBreakersHalfOpen}</span>
      </div>
      <div class="metric">
        <span class="label">Closed:</span>
        <span class="healthy">${metrics.resilience.circuitBreakersClosed}</span>
      </div>
    </div>
    
    <div class="section">
      <h2>Performance</h2>
      <div class="metric">
        <span class="label">Throughput:</span>
        <span class="value">${metrics.performance.throughput} /min</span>
      </div>
      <div class="metric">
        <span class="label">Avg Node Duration:</span>
        <span class="value">${this.formatDuration(metrics.nodes.avgDuration)}</span>
      </div>
      <div class="metric">
        <span class="label">Total Cost:</span>
        <span class="value">${this.formatCost(metrics.performance.totalCost)}</span>
      </div>
    </div>
  </div>
</body>
</html>`
    
    return html
  }

  private formatPercentage(numerator: number, denominator: number): string {
    if (denominator === 0) return "N/A"
    return `${((numerator / denominator) * 100).toFixed(1)}%`
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  private formatCost(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`
  }
}

// global dashboard instance
export const globalDashboard = new ResilienceDashboard()

// convenience functions
export function showDashboard(): void {
  globalDashboard.render()
}

export function startDashboard(refreshIntervalMs?: number): void {
  if (refreshIntervalMs) {
    globalDashboard.startAutoRefresh()
  } else {
    globalDashboard.startAutoRefresh()
  }
}

export function stopDashboard(): void {
  globalDashboard.stopAutoRefresh()
}

export function getDashboardHTML(): string {
  return globalDashboard.getDashboardHTML()
}

// example usage with HTTP server
export function serveDashboard(port: number = 3000): void {
  try {
    const http = require("http")
    
    const server = http.createServer((req: any, res: any) => {
      if (req.url === "/metrics") {
        res.writeHead(200, { "Content-Type": "text/plain" })
        res.end(globalMetricsCollector.exportPrometheus())
      } else if (req.url === "/health") {
        const health = globalHealthMonitor.getOverallStatus()
        const status = health === "HEALTHY" ? 200 : health === "DEGRADED" ? 503 : 500
        res.writeHead(status, { "Content-Type": "application/json" })
        res.end(JSON.stringify({
          status: health,
          components: Object.fromEntries(globalHealthMonitor.getAllHealth()),
        }))
      } else {
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(getDashboardHTML())
      }
    })

    server.listen(port, () => {
      lgg.info(`[Dashboard] Serving dashboard at http://localhost:${port}`)
      lgg.info(`[Dashboard] Metrics endpoint: http://localhost:${port}/metrics`)
      lgg.info(`[Dashboard] Health endpoint: http://localhost:${port}/health`)
    })
  } catch (error) {
    lgg.warn("[Dashboard] Could not start HTTP server:", error)
  }
}