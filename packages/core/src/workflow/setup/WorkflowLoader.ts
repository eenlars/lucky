import { getCoreConfig, isLoggingEnabled } from "@core/core-config/coreConfig"
import { mkdirIfMissing } from "@core/utils/common/files"
import { BrowserEnvironmentError } from "@core/utils/errors/workflow-errors"
import { lgg } from "@core/utils/logging/Logger"
import { isValidToolInformation } from "@core/utils/validation/workflow/toolInformation"
import { verifyWorkflowConfig } from "@core/utils/validation/workflow/verifyWorkflow"
import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { WorkflowConfigSchema, WorkflowConfigSchemaDisplay } from "@core/workflow/schema/workflowSchema"
import { CURRENT_SCHEMA_VERSION } from "@lucky/shared/contracts/workflow"
import type { CodeToolName } from "@lucky/tools"
import type { IPersistence } from "@together/adapter-supabase"

/**
 * Migrate workflow config from any version to current version.
 * Called on every workflow load to ensure old workflows are upgraded.
 *
 * To add a new migration:
 * 1. Increment CURRENT_SCHEMA_VERSION in @lucky/shared/contracts/workflow
 * 2. Add a new if-block below following the pattern
 * 3. Test with old workflows to verify upgrade path
 */
function migrateWorkflowConfig(dsl: any): WorkflowConfig {
  const version = dsl.__schema_version || 0
  let migrated = { ...dsl }

  // v0 -> v1: Add __schema_version field (legacy workflows)
  if (version < 1) {
    migrated = {
      ...migrated,
      __schema_version: 1,
    }
  }

  // Future migrations: add new if-blocks here as schema evolves
  // Example for v1 -> v2:
  // if (version < 2) {
  //   migrated = {
  //     ...migrated,
  //     __schema_version: 2,
  //     nodes: migrated.nodes.map((node: any) => ({
  //       ...node,
  //       tools: node.mcpTools,  // Rename field
  //       mcpTools: undefined,
  //     })),
  //   }
  // }

  return migrated as WorkflowConfig
}

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

    const coreConfig = getCoreConfig()
    const setupFolderPath = path.dirname(path.resolve(coreConfig.paths.setupFile))
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
          gatewayModelId: "openai/gpt-4.1-mini",
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
  async loadSingleWorkflow(filePath?: string): Promise<WorkflowConfig> {
    if (typeof window !== "undefined") {
      throw new BrowserEnvironmentError("loadSingleWorkflow", {
        suggestedAlternative: "API routes",
      })
    }

    const resolvedFilePath = filePath ?? getCoreConfig().paths.setupFile

    try {
      const path = await import("node:path")
      const fs = await import("node:fs")
      const { readText } = await import("@lucky/shared/fs/paths")

      // Normalize path to absolute examples/setup folder and build absolute file path
      const setupFolderPath = await this.ensureSetupFolder()
      const filename = path.basename(resolvedFilePath)
      const normalizedPath = path.join(setupFolderPath, filename)

      // Determine source (default vs custom)
      const coreConfig = getCoreConfig()
      const defaultFilename = path.basename(coreConfig.paths.setupFile)
      const isDefault = filename === defaultFilename || resolvedFilePath === coreConfig.paths.setupFile

      // Check if file exists, if not create it
      let actualFilePath = normalizedPath
      let wasCreated = false
      if (!fs.existsSync(normalizedPath)) {
        actualFilePath = await this.createMissingSetupFile(resolvedFilePath)
        wasCreated = true
      }

      // Clarify exactly what will be used
      lgg.onlyIf(this.verbose, "[WorkflowConfigHandler] Resolved workflow file", {
        source: isDefault ? "default" : "custom",
        requested: resolvedFilePath,
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

      // Migrate if needed
      const migratedData = migrateWorkflowConfig(rawData)

      const workflowConfig: WorkflowConfig = {
        ...migratedData,
        nodes: migratedData.nodes.map(
          (node: any): WorkflowNodeConfig => ({
            ...node,
            // Ensure memory is a properly typed Record<string, string>
            memory: node.memory ? { ...node.memory } : {},
          }),
        ),
        entryNodeId: migratedData.entryNodeId,
        contextFile: migratedData.contextFile,
        toolsInformation:
          migratedData.toolsInformation && isValidToolInformation(migratedData.toolsInformation)
            ? migratedData.toolsInformation
            : undefined,
      }

      // Apply default tools from CONFIG if any are specified
      const toolsConfig = getCoreConfig().tools
      if (toolsConfig.defaultTools.length > 0) {
        const defaultCodeTools = toolsConfig.defaultTools as CodeToolName[]

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
          defaultTools: toolsConfig.defaultTools,
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

      // Migrate to current schema version
      const version = (dsl as any).__schema_version || 0
      if (version < CURRENT_SCHEMA_VERSION) {
        lgg.log(`[WorkflowConfigHandler] Migrating workflow from schema v${version} to v${CURRENT_SCHEMA_VERSION}`)
        const migrated = migrateWorkflowConfig(dsl)
        const parsedConfig = WorkflowConfigSchema.parse(migrated)
        return this.normalizeWorkflowConfig(parsedConfig)
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

      // Migrate to current schema version
      const version = (dsl as any).__schema_version || 0
      if (version < CURRENT_SCHEMA_VERSION) {
        lgg.log(`[WorkflowConfigHandler] Migrating workflow from schema v${version} to v${CURRENT_SCHEMA_VERSION}`)
        const migrated = migrateWorkflowConfig(dsl)
        const parsedConfig = WorkflowConfigSchemaDisplay.parse(migrated)
        return this.normalizeWorkflowConfig(parsedConfig)
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

      const coreConfig = getCoreConfig()
      const filePath = path.isAbsolute(filename) ? filename : path.join(coreConfig.paths.runtime, filename)

      const fileContent = fs.readFileSync(filePath, "utf-8")

      if (!fileContent.trim()) {
        throw new FileSystemError("read", filename, new Error("File content is empty"))
      }

      const fileData = JSON.parse(fileContent)

      // Migrate if needed
      const version = (fileData as any).__schema_version || 0
      if (version < CURRENT_SCHEMA_VERSION) {
        lgg.log(`[WorkflowConfigHandler] Migrating file workflow from schema v${version} to v${CURRENT_SCHEMA_VERSION}`)
        const migrated = migrateWorkflowConfig(fileData)
        const parsedConfig = WorkflowConfigSchema.parse(migrated)
        return this.normalizeWorkflowConfig(parsedConfig)
      }

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

      // Migrate if needed
      const version = (dslConfig as any).__schema_version || 0
      const configToValidate = version < CURRENT_SCHEMA_VERSION ? migrateWorkflowConfig(dslConfig) : dslConfig

      const parsedConfig = WorkflowConfigSchema.parse(configToValidate)
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

    // Ensure schema version is set before saving
    const dataWithVersion = {
      ...data,
      __schema_version: data.__schema_version ?? CURRENT_SCHEMA_VERSION,
    }

    const tmp = `${filePath}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(dataWithVersion, null, 2))
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
    const coreConfig = getCoreConfig()
    const backupDir = path.join(coreConfig.paths.node.logging, "backups")
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
    const coreConfig = getCoreConfig()

    const filepath = path.join(coreConfig.paths.node.logging, "output", filename)
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
