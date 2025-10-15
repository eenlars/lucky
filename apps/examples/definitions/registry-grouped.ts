/**
 * Toolkit-based Code Tool Registry
 *
 * This file organizes all available code tools into logical toolkits.
 * Each toolkit contains related tools that work together to accomplish specific tasks.
 *
 * This structure matches MCP registration for consistency and provides
 * better organization for discovery and documentation.
 */

import { type ToolkitRegistry, createToolkit } from "@lucky/tools"

// CSV Tools
import { tool as csvWriter } from "./csv-handler/tool-create-csv"
import { tool as csvInfo } from "./csv-handler/tool-csv-info"
import { tool as csvFilter } from "./csv-handler/tool-filter-csv"
import { tool as csvReader } from "./csv-handler/tool-read-csv"

// Context Tools
import contextGet from "./contexthandler/tool-context-get"
import contextList from "./contexthandler/tool-context-list"
import contextManage from "./contexthandler/tool-context-manage"
import contextSet from "./contexthandler/tool-context-set"

// Todo Tools
import todoRead from "./todo-manager/tool-todo-read"
import todoWrite from "./todo-manager/tool-todo-write"

// Location Tools
import { tool as locationDataInfo } from "./location-data-info/tool"
import { tool as locationDataManager } from "./location-data-manager/tool"

// Human Interaction Tools
import { tool as humanApproval } from "./human-approval/tool"
import { tool as humanHelp } from "./human-help/tool"

// Web/Scraping Tools
import { tool as firecrawlAPI } from "./api-caller-firecrawl/tool"
import { tool as browserAutomation } from "./browser-automation/tool"
import { tool as searchGoogleMaps } from "./googlescraper/tool"
import urlToMarkdown from "./url-to-markdown/tool"

// File Operations Tools
import { tool as saveFileLegacy } from "./file-saver/tool"

// Development/Testing Tools
import { tool as expectedOutputHandler } from "./expected-output-handler/tool"
import { tool as jsExecutor } from "./js-executor/tool"
import { tool as runInspector } from "./run-inspector/tool"

// Mapping/Geo Tools
import { tool as verifyLocation } from "./mapbox/tool"

// Memory Tools
import { tool as memoryManager } from "./memory/tool"

/**
 * Toolkit registration structure
 */
export const TOOL_TOOLKITS: ToolkitRegistry = {
  toolkits: [
    createToolkit(
      "csv",
      "CSV file handling and manipulation tools for creating, reading, filtering, and analyzing CSV data",
      [
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
    ),

    createToolkit("context", "Context store management tools for persisting and retrieving workflow data", [
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
    ]),

    createToolkit("todo", "Task management tools for creating and tracking todo lists within workflow sessions", [
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
    ]),

    createToolkit("location", "Location data handling tools for managing and querying geographical information", [
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
    ]),

    createToolkit("human", "Human-in-the-loop tools for requesting approval or assistance from human operators", [
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
    ]),

    createToolkit("web", "Web scraping and data collection tools for extracting information from websites", [
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
    ]),

    createToolkit("file", "File system operations for saving and managing files", [
      {
        toolName: "saveFileLegacy",
        toolFunc: saveFileLegacy,
        description: "Save data to files with automatic path resolution",
      },
    ]),

    createToolkit("development", "Development and debugging tools for testing and inspecting workflow execution", [
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
    ]),

    createToolkit("mapping", "Mapping and geolocation tools for verifying and geocoding locations", [
      {
        toolName: "verifyLocation",
        toolFunc: verifyLocation,
        description: "Verify and geocode locations using Mapbox API",
      },
    ]),

    createToolkit("memory", "Long-term memory management tools for storing and retrieving agent memories", [
      {
        toolName: "memoryManager",
        toolFunc: memoryManager,
        description: "Manage agent memories including adding, retrieving, and deleting memory entries",
      },
    ]),
  ],
}
