import { getLogging, getPaths } from "@utils/config/runtimeConfig"
import { lgg } from "@logger"
import type { FlexibleToolDefinition } from "@tools/code/CodeToolRegistry"
import { codeToolRegistry } from "@tools/code/CodeToolRegistry"
import { glob } from "glob"
import path from "path"

/**
 * Auto-discovery system for code tools (Framework Component)
 *
 * This is part of the core tools framework and handles automatic
 * discovery and registration of code tools from the filesystem.
 */
export class CodeToolAutoDiscovery {
  private basePath: string
  private discovered: boolean = false

  constructor(basePath: string = getPaths().codeTools) {
    this.basePath = basePath
  }

  /**
   * Discover all tool files automatically using glob pattern
   */
  async discoverTools(): Promise<FlexibleToolDefinition[]> {
    // Only run on server side
    if (typeof window !== "undefined") {
      return []
    }

    try {
      // Find all tool*.ts files in subdirectories
      const toolPattern = path
        .join(process.cwd(), this.basePath, "**/tool*.ts")
        .replace(/\\/g, "/")

      const allFiles = await glob(toolPattern, {
        absolute: true,
        ignore: ["**/*.test.ts", "**/*.spec.ts"],
      })

      if (getLogging().Tools) {
        lgg.log(`🔍 Discovering tools from pattern: ${toolPattern}`)
        lgg.log(
          `📁 Found ${allFiles.length} potential tool files:`,
          allFiles.map(
            (f) => `${path.basename(path.dirname(f))}/${path.basename(f)}`
          )
        )
      }

      const tools: FlexibleToolDefinition[] = []
      const seenTools = new Set<string>()

      for (const filePath of allFiles) {
        try {
          // Convert absolute path to relative for import
          const relativePath = path
            .relative(process.cwd(), filePath)
            .replace(/\\/g, "/")
          const importPath = relativePath
            .replace(/\.ts$/, "")
            .replace(/^src\//, "@/")

          if (getLogging().Tools) {
            lgg.log(`📦 Importing potential tool from: ${importPath}`)
          }

          // Dynamic import the tool module with explicit path handling
          const toolModule = await import(
            /* webpackChunkName: "code-tools" */ `${importPath}`
          )

          // Convention: Prioritize the standard 'tool' export
          let foundTool: FlexibleToolDefinition | undefined

          if (toolModule.tool && this.isValidTool(toolModule.tool)) {
            foundTool = toolModule.tool as FlexibleToolDefinition
          } else if (
            toolModule.default &&
            this.isValidTool(toolModule.default)
          ) {
            foundTool = toolModule.default as FlexibleToolDefinition
          } else {
            // Look for any export that looks like a tool (from defineTool)
            for (const exp of Object.values(toolModule)) {
              if (
                exp &&
                typeof exp === "object" &&
                "name" in exp &&
                "execute" in exp &&
                typeof exp.execute === "function" &&
                this.isValidTool(exp)
              ) {
                foundTool = exp as FlexibleToolDefinition
                break // Take the first valid tool found
              }
            }
          }

          if (foundTool && !seenTools.has(foundTool.name)) {
            tools.push(foundTool)
            seenTools.add(foundTool.name)
            if (getLogging().Tools) {
              lgg.log(
                `✅ Discovered tool: ${foundTool.name} from ${path.basename(filePath)}`
              )
            }
          } else if (getLogging().Tools && !foundTool) {
            lgg.log(`⏭️ No valid tool found in: ${path.basename(filePath)}`)
          }
        } catch (error) {
          if (getLogging().Tools) {
            lgg.warn(
              `⚠️ Failed to import potential tool from ${filePath}:`,
              error
            )
          }
        }
      }

      return tools
    } catch (error) {
      lgg.error("❌ Error during tool discovery:", error)
      return []
    }
  }

  /**
   * Validate if an export is a valid tool definition
   */
  private isValidTool(obj: any): obj is FlexibleToolDefinition {
    return (
      obj &&
      typeof obj === "object" &&
      typeof obj.name === "string" &&
      typeof obj.description === "string" &&
      obj.parameters &&
      typeof obj.execute === "function"
    )
  }

  /**
   * Auto-setup all discovered tools
   */
  async setupCodeTools(): Promise<FlexibleToolDefinition[]> {
    if (this.discovered) {
      if (getLogging().Tools) {
        lgg.log("🔄 Tools already discovered, skipping...")
      }
      return codeToolRegistry.getAllTools()
    }

    if (getLogging().Tools) {
      lgg.log("🚀 Starting auto-discovery of code tools...")
    }

    const tools = await this.discoverTools()

    if (tools.length === 0) {
      lgg.warn("⚠️ No tools discovered!")
      return []
    }

    // Register all discovered tools
    if (getLogging().Tools) {
      lgg.log(`📝 Registering ${tools.length} tools...`)
    }
    for (const tool of tools) {
      try {
        codeToolRegistry.register(tool)
        if (getLogging().Tools) {
          lgg.log(`✅ Registered: ${tool.name}`)
        }
      } catch (error) {
        lgg.warn(`⚠️ Failed to register tool ${tool.name}:`, error)
      }
    }

    this.discovered = true

    const stats = codeToolRegistry.getStats()
    if (getLogging().Tools) {
      lgg.log(
        `🎉 Auto-discovery complete! ${stats.totalTools} tools registered.`
      )
    }

    return tools
  }

  /**
   * Reset discovery state (useful for testing)
   */
  reset(): void {
    this.discovered = false
  }

  /**
   * Get discovery statistics
   */
  getStats(): { discovered: boolean; basePath: string } {
    return {
      discovered: this.discovered,
      basePath: this.basePath,
    }
  }
}

// global auto-discovery instance
export const codeToolAutoDiscovery = new CodeToolAutoDiscovery()
