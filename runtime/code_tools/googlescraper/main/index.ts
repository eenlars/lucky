// main scraping functionality
export { searchGoogleMaps } from "./main"
export type { GoogleMapsResult } from "./main"

// batch processing
export { BatchProcessor } from "./batch/batch_processor"
export { BatchScraper } from "./batch/batch_scraper"
export { DataManager } from "./data_manager"

export type { BatchScraperConfig, BatchScraperStats } from "./batch/batch_scraper"

export type { BatchProcessorConfig, ProcessResult } from "./batch/batch_processor"

export type { DataManagerConfig, LocationMapLink, ProcessFailure } from "./data_manager"

// proxy management
export {
  getAllWebshareProxies,
  getMultipleWebshareProxiesFull,
  getRandomWebshareProxy,
  getRandomWebshareProxyFull,
  parseProxyString,
} from "../utils/proxies"

export type { ProxyResponse } from "../utils/proxies"

// utilities
export { searchSingleBusiness } from "./page-detail/extractDetailPage"
export { cleanupBrowser, navigateToGoogleMaps, setupBrowser } from "./util"
