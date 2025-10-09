import { CONFIG, PATHS, isLoggingEnabled } from "@core/core-config/compat"
import { mkdirIfMissing } from "@core/utils/common/files"
import { BrowserEnvironmentError } from "@core/utils/errors/workflow-errors"
import { lgg } from "@core/utils/logging/Logger"
import { isValidToolInformation } from "@core/utils/validation/workflow/toolInformation"
import { verifyWorkflowConfig } from "@core/utils/validation/workflow/verifyWorkflow"
import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { WorkflowConfigSchema, WorkflowConfigSchemaDisplay } from "@core/workflow/schema/workflowSchema"
import type { CodeToolName } from "@lucky/tools"
import type { IPersistence } from "@together/adapter-supabase"

class WorkflowConfigError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message)
    this.name = "WorkflowConfigError"
  }
}

class FileSystemError extends WorkflowConfigError {
  constructor(operation: string, filePath: string, cause?: Error) {
    super(`Failed to ${operation} file: ${filePath}`, cause)
    this.name = "FileSystemError"
  }
}

class JSONParseError extends WorkflowConfigError {
  constructor(filePath: string, cause?: Error) {
    super(`Failed to parse JSON from: ${filePath}`, cause)
    this.name = "JSONParseError"
  }
}

class DatabaseError extends WorkflowConfigError {
  constructor(message: string, cause?: Error) {
    super(`Database error: ${message}`, cause)
    this.name = "DatabaseError"
  }
}

/**
 * Workflow configuration handler that loads and saves
 * workflow configurations with setupfile.json support.
 */
export class WorkflowConfigHandler {
  private static instance: WorkflowConfigHandler | null = null
  private verbose: boolean = isLoggingEnabled("Setup")

  private constructor() {}

  /**
   * Ensure the setup folder exists
   */
  private async ensureSetupFolder(): Promise<string> {
    if (typeof window !== "undefined") {
      throw new BrowserEnvironmentError("file operations")
    }

    const path = await import("node:path")
    const fs = await import("node:fs")

    const setupFolderPath = path.dirname(path.resolve(PATHS.setupFile))
    try {
      if (!fs.existsSync(setupFolderPath)) {
        fs.mkdirSync(setupFolderPath, { recursive: true })
      }
      return setupFolderPath
    } catch (error) {
      throw new FileSystemError("create directory", setupFolderPath, error as Error)
    }
  }

  /**
   * Normalize workflow config structure
   */
  private normalizeWorkflowConfig(config: any): WorkflowConfig {
    return {
      ...config,
      memory: config.memory || undefined,
      nodes: config.nodes.map((node: any) => ({
        ...node,
        // Normalize legacy casing if present
        handOffType: node.handOffType,
        memory: node.memory || undefined,
      })),
    }
  }

  /**
   * Create minimal default workflow configuration
   */
  private createDefaultWorkflow(): string {
    const defaultWorkflow = {
      entryNodeId: "main",
      nodes: [
        {
          nodeId: "main",
          description: "Main workflow node",
          modelName: "openai/gpt-4.1-mini",
          mcpTools: [],
          codeTools: [],
          systemPrompt: "You are a helpful assistant. Complete the task as requested.",
          handOffs: ["end"],
          memory: {},
        },
      ],
    }
    return JSON.stringify(defaultWorkflow, null, 2)
  }

  /**
   * Create missing setup file in examples/setup folder
   */
  private async createMissingSetupFile(originalFilePath: string): Promise<string> {
    if (typeof window !== "undefined") {
      throw new BrowserEnvironmentError("file operations")
    }

    const path = await import("node:path")
    const fs = await import("node:fs")

    const setupFolderPath = await this.ensureSetupFolder()
    const filename = path.basename(originalFilePath)
    const targetFilePath = path.join(setupFolderPath, filename)

    lgg.log(`[WorkflowConfigHandler] Creating ${filename} in examples/setup folder`)

    try {
      // Create default workflow
      const content = this.createDefaultWorkflow()

      // Write the file
      fs.writeFileSync(targetFilePath, content)
      lgg.log(`[WorkflowConfigHandler] Created ${targetFilePath}`)

      return targetFilePath
    } catch (error) {
      throw new FileSystemError("create", targetFilePath, error as Error)
    }
  }

  public static getInstance(): WorkflowConfigHandler {
    if (!WorkflowConfigHandler.instance) {
      WorkflowConfigHandler.instance = new WorkflowConfigHandler()
    }
    return WorkflowConfigHandler.instance
  }

  /**
   * Load single workflow configuration from setupfile.json
   */
  async loadSingleWorkflow(filePath: string = PATHS.setupFile): Promise<WorkflowConfig> {
    if (typeof window !== "undefined") {
      throw new BrowserEnvironmentError("loadSingleWorkflow", {
        suggestedAlternative: "API routes",
      })
    }

    try {
      const path = await import("node:path")
      const fs = await import("node:fs")
      const { readText } = await import("@lucky/shared/fs/paths")

      // Normalize path to absolute examples/setup folder and build absolute file path
      const setupFolderPath = await this.ensureSetupFolder()
      const filename = path.basename(filePath)
      const normalizedPath = path.join(setupFolderPath, filename)

      // Determine source (default vs custom)
      const defaultFilename = path.basename(PATHS.setupFile)
      const isDefault = filename === defaultFilename || filePath === PATHS.setupFile

      // Check if file exists, if not create it
      let actualFilePath = normalizedPath
      let wasCreated = false
      if (!fs.existsSync(normalizedPath)) {
        actualFilePath = await this.createMissingSetupFile(filePath)
        wasCreated = true
      }

      // Clarify exactly what will be used
      lgg.onlyIf(this.verbose, "[WorkflowConfigHandler] Resolved workflow file", {
        source: isDefault ? "default" : "custom",
        requested: filePath,
        resolved: normalizedPath,
        used: actualFilePath,
        created: wasCreated,
      })

      let fileContent: string
      let rawData: any

      try {
        // Use shared helper to ensure module-relative reads are consistent
        fileContent = await readText(actualFilePath, import.meta.url)
      } catch (error) {
        throw new FileSystemError("read", actualFilePath, error as Error)
      }

      try {
        rawData = JSON.parse(fileContent)
      } catch (error) {
        throw new JSONParseError(actualFilePath, error as Error)
      }

      const workflowConfig: WorkflowConfig = {
        nodes: rawData.nodes.map(
          (node: any): WorkflowNodeConfig => ({
            ...node,
            // Ensure memory is a properly typed Record<string, string>
            memory: node.memory ? { ...node.memory } : {},
          }),
        ),
        entryNodeId: rawData.entryNodeId,
        contextFile: rawData.contextFile,
        toolsInformation:
          rawData.toolsInformation && isValidToolInformation(rawData.toolsInformation)
            ? rawData.toolsInformation
            : undefined,
      }

      // Apply default tools from CONFIG if any are specified
      if (CONFIG.tools.defaultTools.size > 0) {
        const defaultCodeTools = Array.from(CONFIG.tools.defaultTools) as CodeToolName[]

        workflowConfig.nodes = workflowConfig.nodes.map(node => {
          // Get unique tools by combining existing and defaults
          const existingTools = new Set(node.codeTools || [])
          const combinedTools = [...(node.codeTools || [])]

          // Add default tools that aren't already present
          for (const tool of defaultCodeTools) {
            if (!existingTools.has(tool)) {
              combinedTools.push(tool)
            }
          }

          return {
            ...node,
            codeTools: Array.from(new Set(combinedTools)),
          }
        })

        lgg.onlyIf(this.verbose, "[WorkflowConfigHandler] Applied default tools", {
          defaultTools: CONFIG.tools.defaultTools,
          nodesTooLCount: workflowConfig.nodes?.map(n => ({
            nodeId: n.nodeId,
            toolCount: n.codeTools.length,
          })),
        })
      }

      lgg.onlyIf(this.verbose, "[WorkflowConfigHandler] Successfully loaded workflow", {
        entryNodeId: workflowConfig.entryNodeId,
        nodeCount: workflowConfig.nodes.length,
        hasToolsInfo: !!workflowConfig.toolsInformation,
        filePath: actualFilePath,
        source: isDefault ? "default" : "custom",
      })

      return workflowConfig
    } catch (error) {
      if (error instanceof WorkflowConfigError) {
        lgg.error(`[WorkflowConfigHandler] ${error.name}: ${error.message}`)
        throw error
      }
      lgg.error("[WorkflowConfigHandler] Unexpected error:", error)
      throw new WorkflowConfigError(`Unexpected error loading workflow: ${error}`, error as Error)
    }
  }

  /**
   * Load workflow config from database by version ID
   */
  async loadFromDatabase(workflowVersionId: string, persistence: IPersistence): Promise<WorkflowConfig> {
    try {
      lgg.onlyIf(this.verbose, "[WorkflowConfigHandler] Loading workflow from database:", { workflowVersionId })

      const dsl = await persistence.loadWorkflowConfig(workflowVersionId)

      if (!dsl) {
        throw new DatabaseError(`Workflow version ${workflowVersionId} not found`)
      }

      const parsedConfig = WorkflowConfigSchema.parse(dsl)
      return this.normalizeWorkflowConfig(parsedConfig)
    } catch (error) {
      if (error instanceof WorkflowConfigError) {
        throw error
      }
      throw new DatabaseError(`Failed to load workflow ${workflowVersionId}`, error as Error)
    }
  }

  /**
   * Load workflow config from database for display only (allows legacy model names)
   */
  async loadFromDatabaseForDisplay(workflowVersionId: string, persistence: IPersistence): Promise<WorkflowConfig> {
    try {
      lgg.onlyIf(this.verbose, "[WorkflowConfigHandler] Loading workflow from database for display:", {
        workflowVersionId,
      })

      const dsl = await persistence.loadWorkflowConfigForDisplay(workflowVersionId)

      if (!dsl) {
        throw new DatabaseError(`Workflow version ${workflowVersionId} not found`)
      }

      const parsedConfig = WorkflowConfigSchemaDisplay.parse(dsl)
      return this.normalizeWorkflowConfig(parsedConfig)
    } catch (error) {
      if (error instanceof WorkflowConfigError) {
        throw error
      }
      throw new DatabaseError(`Failed to load workflow ${workflowVersionId}`, error as Error)
    }
  }

  /**
   * Load workflow config from file path
   */
  async loadFromFile(filename: string): Promise<WorkflowConfig> {
    if (typeof window !== "undefined") {
      throw new BrowserEnvironmentError("loadFromFile", {
        suggestedAlternative: "API routes",
      })
    }

    try {
      lgg.onlyIf(this.verbose, "[WorkflowConfigHandler] Loading workflow from file:", { filename })

      const path = await import("node:path")
      const fs = await import("node:fs")

      const filePath = path.isAbsolute(filename) ? filename : path.join(PATHS.runtime, filename)

      const fileContent = fs.readFileSync(filePath, "utf-8")

      if (!fileContent.trim()) {
        throw new FileSystemError("read", filename, new Error("File content is empty"))
      }

      const fileData = JSON.parse(fileContent)
      const parsedConfig = WorkflowConfigSchema.parse(fileData)
      return this.normalizeWorkflowConfig(parsedConfig)
    } catch (error) {
      if (error instanceof WorkflowConfigError) {
        throw error
      }
      throw new FileSystemError("load", filename, error as Error)
    }
  }

  /**
   * Load workflow config from DSL object
   */
  async loadFromDSL(dslConfig: WorkflowConfig): Promise<WorkflowConfig> {
    try {
      lgg.onlyIf(this.verbose, "[WorkflowConfigHandler] Loading workflow from DSL config")

      console.log("dslConfig", JSON.stringify(dslConfig, null, 2))

      const parsedConfig = WorkflowConfigSchema.parse(dslConfig)
      // Cast to WorkflowConfig - Zod schema validates structure, runtime validates model names
      const workflowConfig = parsedConfig as unknown as WorkflowConfig
      await verifyWorkflowConfig(workflowConfig, {
        throwOnError: true,
      })

      return this.normalizeWorkflowConfig(workflowConfig)
    } catch (error) {
      throw new WorkflowConfigError("Failed to parse DSL config", error as Error)
    }
  }

  /**
   * Atomic write function for JSON data
   */
  private async writeJsonAtomic(filePath: string, data: WorkflowConfig): Promise<void> {
    if (typeof window !== "undefined") {
      throw new BrowserEnvironmentError("writeJsonAtomic")
    }

    const fs = await import("node:fs")
    const tmp = `${filePath}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
    fs.renameSync(tmp, filePath) // atomic on POSIX filesystems
  }

  /**
   * Save workflow config to setup folder with atomic writes and optional backup
   */
  async saveWorkflowConfig(config: WorkflowConfig, filename = "setupfile.json", skipBackup = false): Promise<void> {
    if (typeof window !== "undefined") {
      throw new BrowserEnvironmentError("saveWorkflowConfig")
    }

    const path = await import("node:path")
    const setupFolderPath = await this.ensureSetupFolder()
    const backupDir = path.join(PATHS.node.logging, "backups")
    mkdirIfMissing(backupDir)

    const stamp = new Date().toISOString().replace(/[:.]/g, "-")

    // Save to setup folder
    const filename_normalized = path.basename(filename)
    const configPath = path.join(setupFolderPath, filename_normalized)

    await this.writeJsonAtomic(configPath, config)

    // Create backup unless skipBackup is true
    if (!skipBackup) {
      const backupName = path.basename(filename, path.extname(filename))
      await this.writeJsonAtomic(path.join(backupDir, `${backupName}_${stamp}.json`), config)
      lgg.log(`✅ persisted + backed up ${configPath}`)
    } else {
      lgg.log(`✅ persisted ${configPath} (backup skipped)`)
    }
  }

  /**
   * Legacy method: Save workflow config to output folder (for backward compatibility)
   */
  async saveWorkflowConfigToOutput(config: WorkflowConfig, filename: string): Promise<void> {
    const fs = await import("node:fs/promises")
    const path = await import("node:path")

    const filepath = path.join(PATHS.node.logging, "output", filename)
    await fs.mkdir(path.dirname(filepath), { recursive: true })
    await fs.writeFile(filepath, JSON.stringify(config, null, 2))

    lgg.log(`💾 Saved best workflow to: ${filepath}`)
  }
}

// Export convenience functions for backward compatibility
export const workflowConfigHandler = WorkflowConfigHandler.getInstance()
export const loadSingleWorkflow = (filePath?: string) => workflowConfigHandler.loadSingleWorkflow(filePath)

// These database functions now need to create their own persistence
import { SupabasePersistence } from "@together/adapter-supabase"

export const loadFromDatabase = async (workflowVersionId: string) => {
  const persistence = new SupabasePersistence()
  return workflowConfigHandler.loadFromDatabase(workflowVersionId, persistence)
}

export const loadFromDatabaseForDisplay = async (workflowVersionId: string) => {
  const persistence = new SupabasePersistence()
  return workflowConfigHandler.loadFromDatabaseForDisplay(workflowVersionId, persistence)
}
export const loadFromFile = (filename: string) => workflowConfigHandler.loadFromFile(filename)
export const loadFromDSL = (dslConfig: WorkflowConfig) => workflowConfigHandler.loadFromDSL(dslConfig)
export const saveWorkflowConfig = (config: WorkflowConfig, filename: string, skipBackup?: boolean) =>
  workflowConfigHandler.saveWorkflowConfig(config, filename, skipBackup)
export const saveWorkflowConfigToOutput = (config: WorkflowConfig, filename: string) =>
  workflowConfigHandler.saveWorkflowConfigToOutput(config, filename)

// Alias for backward compatibility with resultPersistence.ts
export const persistWorkflow = (
  finalConfig: WorkflowConfig,
  fileName = "setupfile.json",
  skipBackup = false,
): Promise<void> => {
  return workflowConfigHandler.saveWorkflowConfig(finalConfig, fileName, skipBackup)
}
