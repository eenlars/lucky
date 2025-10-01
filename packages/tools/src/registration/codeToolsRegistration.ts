/**
 * Code Tool Registration File
 *
 * This file organizes all available code tools into logical groups.
 * Each group contains related tools that work together to accomplish specific tasks.
 *
 * Import this at startup and register all tools with your registry.
 * Structure matches MCP registration for consistency.
 */

// CSV Tools
import { tool as csvWriter } from "../definitions/csv-handler/tool-create-csv"
import { tool as csvReader } from "../definitions/csv-handler/tool-read-csv"
import { tool as csvFilter } from "../definitions/csv-handler/tool-filter-csv"
import { tool as csvInfo } from "../definitions/csv-handler/tool-csv-info"

// Context Tools
import contextGet from "../definitions/contexthandler/tool-context-get"
import contextSet from "../definitions/contexthandler/tool-context-set"
import contextList from "../definitions/contexthandler/tool-context-list"
import contextManage from "../definitions/contexthandler/tool-context-manage"

// Todo Tools
import todoRead from "../definitions/todo-manager/tool-todo-read"
import todoWrite from "../definitions/todo-manager/tool-todo-write"

// Location Tools
import { tool as locationDataInfo } from "../definitions/location-data-info/tool"
import { tool as locationDataManager } from "../definitions/location-data-manager/tool"

// Human Interaction Tools
import { tool as humanApproval } from "../definitions/human-approval/tool"
import { tool as humanHelp } from "../definitions/human-help/tool"

// Web/Scraping Tools
import { tool as firecrawlAPI } from "../definitions/api-caller-firecrawl/tool"
import { tool as searchGoogleMaps } from "../definitions/googlescraper/tool"
import urlToMarkdown from "../definitions/url-to-markdown/tool"
import { tool as browserAutomation } from "../definitions/browser-automation/tool"

// File Operations Tools
import { tool as saveFileLegacy } from "../definitions/file-saver/tool"

// Development/Testing Tools
import { tool as runInspector } from "../definitions/run-inspector/tool"
import { tool as jsExecutor } from "../definitions/js-executor/tool"
import { tool as expectedOutputHandler } from "../definitions/expected-output-handler/tool"

// Mapping/Geo Tools
import { tool as verifyLocation } from "../definitions/mapbox/tool"

// Memory Tools
import { tool as memoryManager } from "../definitions/memory/tool"

/**
 * Type definitions - matches MCP structure for consistency
 */
export type CodeToolDefinition = {
  toolName: string
  toolFunc: any // The actual tool function from defineTool()
  description: string
}

export type CodeToolGroup = {
  groupName: string
  description: string
  tools: CodeToolDefinition[]
}

/**
 * Code Tool registration structure with grouped tools
 * Same structure as MCP tools for easy maintenance
 */
export const toolGroups: {
  groups: CodeToolGroup[]
} = {
  groups: [
    {
      groupName: "csv",
      description: "CSV file handling and manipulation tools for creating, reading, filtering, and analyzing CSV data",
      tools: [
        {
          toolName: "csvWriter",
          toolFunc: csvWriter,
          description: "Create and write CSV files from row or column data with custom delimiters and headers",
        },
        {
          toolName: "csvReader",
          toolFunc: csvReader,
          description: "Read and extract data from CSV files with pagination support",
        },
        {
          toolName: "csvFilter",
          toolFunc: csvFilter,
          description: "Filter CSV data based on column values and conditions",
        },
        {
          toolName: "csvInfo",
          toolFunc: csvInfo,
          description: "Get metadata and statistics about CSV files including column info and row counts",
        },
      ],
    },
    {
      groupName: "context",
      description: "Context store management tools for persisting and retrieving workflow data",
      tools: [
        {
          toolName: "contextGet",
          toolFunc: contextGet,
          description: "Retrieve data from the persistent context store with optional default values",
        },
        {
          toolName: "contextSet",
          toolFunc: contextSet,
          description: "Store data in the persistent context store at workflow or node scope",
        },
        {
          toolName: "contextList",
          toolFunc: contextList,
          description: "List all keys and values stored in the context store",
        },
        {
          toolName: "contextManage",
          toolFunc: contextManage,
          description: "Manage context store entries including deletion and updates",
        },
      ],
    },
    {
      groupName: "todo",
      description: "Task management tools for creating and tracking todo lists within workflow sessions",
      tools: [
        {
          toolName: "todoRead",
          toolFunc: todoRead,
          description: "Read the current session's todo list with status and priority information",
        },
        {
          toolName: "todoWrite",
          toolFunc: todoWrite,
          description: "Create, update, or modify todo items in the session's task list",
        },
      ],
    },
    {
      groupName: "location",
      description: "Location data handling tools for managing and querying geographical information",
      tools: [
        {
          toolName: "locationDataInfo",
          toolFunc: locationDataInfo,
          description: "Get information about stored location data including counts and summaries",
        },
        {
          toolName: "locationDataManager",
          toolFunc: locationDataManager,
          description: "Manage location data including adding, updating, and deleting location entries",
        },
      ],
    },
    {
      groupName: "human",
      description: "Human-in-the-loop tools for requesting approval or assistance from human operators",
      tools: [
        {
          toolName: "humanApproval",
          toolFunc: humanApproval,
          description: "Request human approval with optional choices and timeout settings",
        },
        {
          toolName: "humanHelp",
          toolFunc: humanHelp,
          description: "Request human assistance or guidance for complex decisions",
        },
      ],
    },
    {
      groupName: "web",
      description: "Web scraping and data collection tools for extracting information from websites",
      tools: [
        {
          toolName: "firecrawlAPI",
          toolFunc: firecrawlAPI,
          description: "Scrape websites using Firecrawl API with structured data extraction",
        },
        {
          toolName: "searchGoogleMaps",
          toolFunc: searchGoogleMaps,
          description: "Search Google Maps for locations and extract business information",
        },
        {
          toolName: "urlToMarkdown",
          toolFunc: urlToMarkdown,
          description: "Convert web pages to clean markdown format for analysis",
        },
        {
          toolName: "browserAutomation",
          toolFunc: browserAutomation,
          description: "Automate browser interactions using Playwright for complex web scraping",
        },
      ],
    },
    {
      groupName: "file",
      description: "File system operations for saving and managing files",
      tools: [
        {
          toolName: "saveFileLegacy",
          toolFunc: saveFileLegacy,
          description: "Save data to files with automatic path resolution",
        },
      ],
    },
    {
      groupName: "development",
      description: "Development and debugging tools for testing and inspecting workflow execution",
      tools: [
        {
          toolName: "runInspector",
          toolFunc: runInspector,
          description: "Inspect workflow run details and execution traces",
        },
        {
          toolName: "jsExecutor",
          toolFunc: jsExecutor,
          description: "Execute arbitrary JavaScript code in a sandboxed environment",
        },
        {
          toolName: "expectedOutputHandler",
          toolFunc: expectedOutputHandler,
          description: "Validate workflow outputs against expected results for testing",
        },
      ],
    },
    {
      groupName: "mapping",
      description: "Mapping and geolocation tools for verifying and geocoding locations",
      tools: [
        {
          toolName: "verifyLocation",
          toolFunc: verifyLocation,
          description: "Verify and geocode locations using Mapbox API",
        },
      ],
    },
    {
      groupName: "memory",
      description: "Long-term memory management tools for storing and retrieving agent memories",
      tools: [
        {
          toolName: "memoryManager",
          toolFunc: memoryManager,
          description: "Manage agent memories including adding, retrieving, and deleting memory entries",
        },
      ],
    },
  ],
}

/**
 * Get all tools flattened from all groups
 */
export function getAllTools() {
  return toolGroups.groups.flatMap(group => group.tools)
}

/**
 * Get tools by group name
 */
export function getToolsByGroup(groupName: string) {
  const group = toolGroups.groups.find(g => g.groupName === groupName)
  return group?.tools ?? []
}

/**
 * Get a specific tool by name
 */
export function getToolByName(toolName: string) {
  for (const group of toolGroups.groups) {
    const tool = group.tools.find(t => t.toolName === toolName)
    if (tool) return tool
  }
  return null
}
