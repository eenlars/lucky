import { CONFIG } from "@/runtime/settings/constants"
import Bottleneck from "bottleneck"

export const limiter = new Bottleneck({
  maxConcurrent: CONFIG.limits.maxConcurrentAIRequests,
  reservoir: CONFIG.limits.maxRequestsPerWindow,
  reservoirRefreshInterval: CONFIG.limits.rateWindowMs,
  reservoirRefreshAmount: CONFIG.limits.maxRequestsPerWindow,
})
