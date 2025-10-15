/**
 * PERFECT IMPLEMENTATION EXAMPLE (2024 refactor)
 *
 * Goal: demonstrate a startup-friendly, instance-based tool system that
 * keeps @lucky/tools flexible without carrying around global state.
 *
 * Key ideas:
 * - createCodeToolRegistry() gives every worker/request/test its own registry
 * - registerAllTools(...) wires tool groups exactly once per registry
 * - setupCodeToolsForNode(...) materializes ToolSets when you have context
 * - bootstrap is explicit; no magic auto-registration in production unless
 *   you opt-in via config.
 */

import {
  LocalMCPRegistry,
  createCodeToolRegistry,
  defineTool,
  registerAllTools,
  setupCodeToolsForNode,
} from "@lucky/tools"
import { z } from "zod"

const defaultConfig = {
  /**
   * Validate tool schemas & definitions during startup. Keep on in dev,
   * optionally disable in hot paths once you trust the bundle.
   */
  validate: process.env.NODE_ENV !== "production",

  /**
   * Automatically pull in the @examples tool bundle. Handy locally, but you
   * likely want to disable this in production and pass your own groups.
   */
  autoRegisterExamples: process.env.NODE_ENV !== "production",

  /**
   * Optional explicit local MCP bundle. When provided we register these instead
   * of falling back to the example bundle.
   */
  localMCP: null,

  /**
   * Allow advanced callers to supply a pre-built registry (e.g., for testing
   * or when embedding into another system). Defaults to a fresh instance.
   */
  registry: null,
}

export function createToolSystem(options = {}) {
  const config = { ...defaultConfig, ...options }
  const registry = config.registry ?? createCodeToolRegistry()
  let bootstrapPromise = null

  let localRegistry = null

  async function bootstrap() {
    if (bootstrapPromise) return bootstrapPromise

    bootstrapPromise = (async () => {
      const localMCPConfig = config.localMCP

      if (localMCPConfig) {
        localRegistry =
          localMCPConfig instanceof LocalMCPRegistry ? localMCPConfig : new LocalMCPRegistry(localMCPConfig)

        await registerAllTools(localRegistry.codeToolGroups, { validate: config.validate }, registry)
        return registry.getStats()
      }

      if (config.autoRegisterExamples) {
        const { TOOL_GROUPS } = await import("@examples/definitions/registry-grouped")
        localRegistry = new LocalMCPRegistry({
          servers: [
            {
              id: "examples",
              label: "Example Code Tools",
              description: "Prepackaged code tools from @examples",
              transport: { type: "stdio", command: "node", args: [] },
              tools: TOOL_GROUPS.groups.flatMap(group =>
                group.tools.map(tool => ({
                  name: tool.toolName,
                  description: tool.description,
                  definition: tool.toolFunc,
                })),
              ),
            },
          ],
        })

        await registerAllTools(localRegistry.codeToolGroups, { validate: config.validate }, registry)
        return registry.getStats()
      }

      // No tool groups provided; still mark registry initialized so callers
      // can register ad-hoc later without hitting the guard.
      await registry.initialize()
      return registry.getStats()
    })()

    return bootstrapPromise
  }

  async function getToolsForWorkflow(toolNames, toolExecutionContext) {
    if (!toolExecutionContext) {
      throw new Error("ToolExecutionContext is required to materialize tools")
    }

    // Ensure registry is ready before building tool instances. This keeps
    // the call site simple: you can await bootstrap() once at app startup or
    // let this helper do it lazily.
    await bootstrap()

    const toolSet = await setupCodeToolsForNode(toolNames, toolExecutionContext, {
      registry,
    })
    return toolSet
  }

  async function shutdown() {
    await registry.destroy()
    bootstrapPromise = null
    localRegistry = null
  }

  return {
    registry,
    bootstrap,
    getToolsForWorkflow,
    shutdown,
    getLocalMCPRegistry: () => localRegistry,
  }
}

// --------------------------------------------------------------------------
// Example Usage
// --------------------------------------------------------------------------

/**
 * Next.js / edge worker bootstrap example
 */
const helloWorld = defineTool({
  name: "helloWorld",
  description: "Return a friendly greeting",
  params: z.object({
    subject: z.string().describe("Name to greet"),
  }),
  async execute({ subject }) {
    return {
      success: true,
      data: `Hello, ${subject}!`,
    }
  },
})

export const toolSystem = createToolSystem({
  localMCP: {
    servers: [
      {
        id: "local-dev",
        label: "Local Dev Tools",
        description: "Instance-scoped tools mirroring MCP semantics",
        transport: {
          type: "stdio",
          command: "node",
          args: ["./scripts/local-dev-mcp.mjs"],
          env: {
            LUCKY_API_KEY: process.env.LUCKY_API_KEY ?? "test-key",
          },
        },
        tools: [
          {
            name: "helloWorld",
            description: "Say hello like an MCP tool",
            definition: helloWorld,
          },
        ],
      },
    ],
  },
  autoRegisterExamples: false,
})

// Call once during app start (e.g., in Next.js middleware or server init)
// void toolSystem.bootstrap()

/**
 * Later, inside a handler with workflow context
 */
export async function handleWorkflowInvocation({ toolNames, context }) {
  const aiTools = await toolSystem.getToolsForWorkflow(toolNames, context)
  return aiTools
}

/**
 * In tests, create isolated systems per suite.
 */
export function createTestToolSystem(overrides = {}) {
  return createToolSystem({
    autoRegisterExamples: true,
    ...overrides,
  })
}
