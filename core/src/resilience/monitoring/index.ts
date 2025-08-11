// monitoring exports
export {
  MetricsCollector,
  globalMetricsCollector,
  recordWorkflowStart,
  recordWorkflowComplete,
  recordNodeInvocation,
  recordRetry,
  type Metric,
  type MetricSummary,
  type SystemMetrics,
} from "./MetricsCollector"

export {
  ResilienceDashboard,
  globalDashboard,
  showDashboard,
  startDashboard,
  stopDashboard,
  getDashboardHTML,
  serveDashboard,
  type DashboardOptions,
} from "./Dashboard"

// start collection by default
import { globalMetricsCollector } from "./MetricsCollector"
import { lgg } from "@core/utils/logging/Logger"

// auto-start metrics collection
globalMetricsCollector.startCollection(10000) // collect every 10 seconds
lgg.info("[Monitoring] Started automatic metrics collection")