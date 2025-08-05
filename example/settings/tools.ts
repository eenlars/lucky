// import type { getToolsConfig } from "@core/index" // Not exported
import type { AllToolNames } from "@core/tools/tool.types"

type ToolsConfig = {
  experimentalMultiStepLoopMaxRounds: number
  inactive: Set<AllToolNames>
  uniqueToolsPerAgent: boolean
  uniqueToolSetsPerAgent: boolean
  maxToolsPerAgent: number
  maxStepsVercel: number
  defaultTools: Set<AllToolNames>
  autoSelectTools: boolean
  usePrepareStepStrategy: boolean
  experimentalMultiStepLoop: boolean
  showParameterSchemas: boolean
}

// tool definitions and configuration
export const TOOLS = {
  mcp: {
    proxy: "Proxy requests to a specific URL",
    tavily: "Search the web",
    filesystem: "Save and load files",
    firecrawl: "Search the web",
    browserUse:
      "Use a browser to navigate to a URL and return the HTML. its quite slow, but works for very hard websites.",
    googleScholar: "Search Google Scholar",
    playwright: "Use a browser to do navigation and find data.",
    serpAPI: "Search the web",
  },
  code: {
    searchGoogleMaps:
      "Search Google Maps for business information. Supports 'auto' mode (detects single/multiple results), 'multiple' mode (for listings), and 'url' mode (direct URL). Returns up to 120 results with business details, hours, contact info. you can filter by hostname (e.g. albertheijn.nl, ...), you can only use hostname.tld (two parts). CANNOT: interact with map elements, click buttons, or handle pages requiring authentication.",
    saveFileLegacy:
      "Save any data to a file at specified path, creates directories if needed. LIMITS: restricted to accessible filesystem paths, overwrites existing files without warning, no append mode",
    readFileLegacy:
      "Read and return file contents as string. LIMITS: entire file loaded into memory, not suitable for binary files or files >10MB, returns error if file doesn't exist",
    verifyLocation:
      "Geocode a list of addresses to get coordinates, place name, and context using Mapbox. Best with complete addresses. LIMITS: may return multiple results for ambiguous queries, less accurate with partial addresses",
    locationDataManager:
      "PRIMARY tool for location data CRUD operations: insertLocations (add/save data), getLocations (retrieve raw data), removeLocations (delete), updateLocations (modify). Use when you need to store, modify, or retrieve the complete location dataset. LIMITS: JSON file-based storage, workflow-scoped only.",
    locationDataInfo:
      "ANALYSIS tool for location data insights: count (get totals), getLocations (formatted addresses), verify (quality checks), summary (statistics). Use when you need formatted output, quality analysis, or statistics from existing data. LIMITS: read-only, requires data from locationDataManager first.",
    browserAutomation:
      "Capture network traffic and page data from URLs. Monitors HTTP requests/responses, filters by resource type, saves response bodies. CANNOT: interact with pages (no clicking/typing), handle dynamic content requiring user actions, bypass authentication, or execute custom scripts.",
    firecrawlAPI:
      "Extract structured data from websites using Firecrawl's AI. Provide URL, prompt, and schema for extraction. Best for static content extraction. LIMITS: requires API key, may fail on dynamic/JavaScript-heavy sites, rate limited, cannot handle authentication or complex interactions.",
    urlToMarkdown:
      "Convert URL content to clean markdown, removing ads/navigation/scripts. Preserves main content, links, images. Falls back to Jina AI if direct fetch fails. CANNOT: handle authentication-required pages, extract from PDFs/videos, preserve complex layouts/tables, or handle JavaScript-rendered content.",
    csvReader:
      "Extract column data from CSV files with pagination. Reads specific columns, supports page/limit params. FILE MUST: be provided via workflowFiles, be accessible via HTTPS URL (Supabase). LIMITS: loads entire file into memory, no streaming for huge files.",
    csvInfo:
      "Get CSV file metadata: headers, column count, row count, data types, sample values. FILE MUST: be provided via workflowFiles, be accessible via HTTPS URL. LIMITS: memory-based processing, samples only first rows for type detection.",
    csvWriter:
      "Create or append to CSV files. Supports headers, custom delimiters, data validation. FILE MUST: be provided via workflowFiles. LIMITS: memory-based (entire file loaded), no streaming writes, validates all data before writing.",
    csvFilter:
      "Filter CSV rows with conditions. Supports: simple filters, multiple values, numeric ranges, complex AND/OR logic, multiple operators (equals, contains, greater than, etc). FILE MUST: be provided via workflowFiles. LIMITS: processes entire file in memory, no SQL-like queries.",
    contextHandler:
      "Store/retrieve workflow or node-scoped data. Operations: get, set, list, delete. Persists across workflow executions. LIMITS: simple key-value storage only, no complex queries, delete operation sets to null (not true deletion), requires workflowInvocationId.",
    contextList:
      "List keys in the persistent context store by scope (workflow/node). Returns array of key names only, not values. LIMITS: no filtering/searching, only returns keys not values, requires workflowInvocationId.",
    contextGet:
      "Retrieve a specific value from context store by key and scope. Returns null if not found. LIMITS: single key access only, no batch operations, requires exact key name, needs workflowInvocationId. YOU NEED TO KNOW THE KEY NAME TO USE THIS TOOL. YOU CANNOT USE THIS TOOL TO GET THE KEY NAME.",
    contextSet:
      "Store a value in context by key and scope. Overwrites existing values. Supports any JSON-serializable data. LIMITS: no merge operations, overwrites existing data, no versioning/history, requires workflowInvocationId.",
    contextManage:
      "Advanced context operations: clear all data, copy between scopes, bulk operations. LIMITS: destructive operations (clear) cannot be undone, copy operations overwrite destination, requires workflowInvocationId.",
    csvRowProcessor:
      "Extract CSV row data passed during batch processing, access specific columns by name. LIMITS: only works with pre-passed row data, cannot read files directly, designed for single-row operations in batch workflows",
    todoRead:
      "Read the current session's todo list. Returns array of todo items with their status, priority, and content. LIMITS: read-only operation, session-scoped only, no filtering or search capabilities.",
    todoWrite:
      "Create and manage structured task lists for coding sessions. Overwrites entire todo list, validates constraints (only one in_progress task, unique IDs). LIMITS: overwrites all todos, session-scoped only, no partial updates or merging.",
    expectedOutputHandler:
      "Handle LLM requests with expected output validation. Sends prompt to AI model and validates response against provided schema. LIMITS: schema validation may fail with complex outputs, retries limited to 2 attempts.",
    memoryManager:
      "Manage persistent memories using Mem0: add, get/search, getAll, update, or delete memories for context persistence in workflows.",
    humanApproval:
      "Request human approval during workflow execution. Displays message in terminal with clickable link, blocks until approval/rejection received. Supports custom messages, optional choices, and configurable timeout. LIMITS: requires manual intervention, blocks workflow execution, timeout default 5 minutes.",
    humanHelp:
      "call a human for help. you can ask anything you want to improve.",
    runInspector:
      "Inspect and analyze the current workflow invocation logs. Provides comprehensive information about what happened in the workflow so far, including node invocations, messages, execution status, costs, and errors. Use this to debug workflows, understand execution flow, or get detailed logs for analysis.",
    jsExecutor:
      "Execute JavaScript code in a sandboxed environment. Provide JavaScript code and optional timeoutMs (ms). No access to Node APIs, filesystem, or network. Execution limited to 1 second by default.",
  },
} as const

// tool runtime configuration
export const TOOL_CONFIG: ToolsConfig = {
  experimentalMultiStepLoopMaxRounds: 10,
  inactive: new Set<AllToolNames>([
    // DO NOT CHANGE THIS!
    // "tavily",
    "todoWrite",
    "todoRead",
    "urlToMarkdown",
    // "browserUse",
    "serpAPI",
    "playwright",
    "browserAutomation",
    "readFileLegacy",
    "saveFileLegacy",
    // "expectedOutputHandler",
    "proxy",
    "filesystem",
    // "googleScholar",
    "csvReader",
    "csvInfo",
    "csvWriter",
    "csvFilter",
    "contextHandler",
    "csvRowProcessor",
    "contextGet",
    "contextList",
    "contextSet",
    "contextManage",
    "memoryManager",
    "firecrawlAPI",
    "firecrawl",
    "humanApproval",
    "humanHelp",
    // DO NOT CHANGE THIS!
  ]),
  uniqueToolsPerAgent: false,
  uniqueToolSetsPerAgent: false,
  maxToolsPerAgent: 3,
  maxStepsVercel: 10,
  defaultTools: new Set<AllToolNames>([
    // "memoryManager",
    // "todoWrite",
    // "todoRead",
  ]), // Tools to automatically add to all nodes
  autoSelectTools: true,
  usePrepareStepStrategy: false, // Use experimental_prepareStep instead of single toolChoice
  experimentalMultiStepLoop: true, // in kimi, it might be working with an auto-loop.... -> result: it does not work!
  showParameterSchemas: false, // Show parameter schemas to AI models for better tool calling
} as const

// tool-related improvement settings
export const TOOL_IMPROVEMENT_CONFIG = {
  addTools: true,
} as const
