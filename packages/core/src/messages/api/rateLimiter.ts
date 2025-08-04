import { getConfig, getModels } from "@/config"
import Bottleneck from "bottleneck"

export const limiter = new Bottleneck({
  maxConcurrent: getConfig().limits.maxConcurrentAIRequests,
  reservoir: getConfig().limits.maxRequestsPerWindow,
  reservoirRefreshInterval: getConfig().limits.rateWindowMs,
  reservoirRefreshAmount: getConfig().limits.maxRequestsPerWindow,
})
