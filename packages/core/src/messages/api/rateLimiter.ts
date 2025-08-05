import { getSettings } from "@utils/config/runtimeConfig"
import Bottleneck from "bottleneck"

export const limiter = new Bottleneck({
  maxConcurrent: getSettings().limits.maxConcurrentAIRequests,
  reservoir: getSettings().limits.maxRequestsPerWindow,
  reservoirRefreshInterval: getSettings().limits.rateWindowMs,
  reservoirRefreshAmount: getSettings().limits.maxRequestsPerWindow,
})
