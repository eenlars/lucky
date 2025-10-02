/**
 * Static tool registry - explicit imports for bundling
 */

// Import all tools (handling both named and default exports)
import { tool as firecrawlAPI } from "./api-caller-firecrawl/tool"
import { tool as browserAutomation } from "./browser-automation/tool"
import contextGet from "./contexthandler/tool-context-get"
import contextList from "./contexthandler/tool-context-list"
import contextManage from "./contexthandler/tool-context-manage"
import contextSet from "./contexthandler/tool-context-set"
import { tool as csvWriter } from "./csv-handler/tool-create-csv"
import { tool as csvInfo } from "./csv-handler/tool-csv-info"
import { tool as csvFilter } from "./csv-handler/tool-filter-csv"
import { tool as csvReader } from "./csv-handler/tool-read-csv"
import { tool as expectedOutputHandler } from "./expected-output-handler/tool"
import { tool as saveFileLegacy } from "./file-saver/tool"
import { tool as searchGoogleMaps } from "./googlescraper/tool"
import { tool as humanApproval } from "./human-approval/tool"
import { tool as humanHelp } from "./human-help/tool"
import { tool as jsExecutor } from "./js-executor/tool"
import { tool as locationDataInfo } from "./location-data-info/tool"
import { tool as locationDataManager } from "./location-data-manager/tool"
import { tool as verifyLocation } from "./mapbox/tool"
import { tool as memoryManager } from "./memory/tool"
import { tool as runInspector } from "./run-inspector/tool"
import todoRead from "./todo-manager/tool-todo-read"
import todoWrite from "./todo-manager/tool-todo-write"
import urlToMarkdown from "./url-to-markdown/tool"

// Export all tools
export const ALL_TOOLS = [
  saveFileLegacy,
  browserAutomation,
  contextGet,
  contextSet,
  contextList,
  contextManage,
  csvReader,
  csvInfo,
  csvWriter,
  csvFilter,
  firecrawlAPI,
  urlToMarkdown,
  searchGoogleMaps,
  verifyLocation,
  locationDataManager,
  locationDataInfo,
  memoryManager,
  humanApproval,
  humanHelp,
  runInspector,
  jsExecutor,
  todoRead,
  todoWrite,
  expectedOutputHandler,
]
