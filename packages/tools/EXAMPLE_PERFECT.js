/**
 * PERFECT IMPLEMENTATION EXAMPLE
 *
 * This file demonstrates the ideal tool system architecture based on requirements.
 * Shows configuration, registration, validation, and AI SDK integration.
 *
 * NOTE: This is the TOOL FRAMEWORK only - workflow orchestration is a separate concern.
 */

// ============================================================================
// 1. CONFIGURATION - Single source of truth
// ============================================================================

const toolSystemConfig = {
  environment: "production",

  // Adapter selection for different tool sources
  adapters: {
    custom: "manual", // manual registration for custom tools
    mcp: "config-file", // MCP tools from config file
    remote: null, // Could be "api", "grpc", etc.
  },

  // MCP server configurations
  mcpServers: {
    "browser-automation": {
      command: "npx",
      args: ["-y", "@playwright/mcp@latest"],
      enabled: true,
    },
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
      enabled: false, // disabled in this environment
    },
  },

  // Validation rules
  validation: {
    strictMode: true,
    validateOnStartup: true,
    throwOnMissingTool: true,
  },
}

// ============================================================================
// 2. TOOL REGISTRY - Central registry of available tools
// ============================================================================

class ToolRegistry {
  constructor(config) {
    this.config = config
    this.customTools = new Map()
    this.mcpTools = new Map()
    this.adapters = new Map()
    this.initialized = false
  }

  // Register a custom tool definition
  registerCustomTool(definition) {
    if (this.initialized) {
      throw new Error("Cannot register tools after initialization")
    }

    const validation = validateCustomTool(definition)
    if (!validation.valid) {
      throw new Error(`Tool validation failed: ${validation.errors.join(", ")}`)
    }

    this.customTools.set(definition.name, definition)
  }

  // Register multiple custom tools
  registerCustomTools(definitions) {
    for (const def of definitions) {
      this.registerCustomTool(def)
    }
  }

  // Initialize MCP tools from configuration
  async initializeMCPTools() {
    const mcpAdapter = this.adapters.get("mcp")
    if (!mcpAdapter) {
      throw new Error("MCP adapter not configured")
    }

    const mcpToolDefinitions = await mcpAdapter.loadTools(this.config.mcpServers)

    for (const [name, definition] of mcpToolDefinitions) {
      const validation = validateMCPTool(definition)
      if (!validation.valid) {
        throw new Error(`MCP tool validation failed for ${name}: ${validation.errors.join(", ")}`)
      }
      this.mcpTools.set(name, definition)
    }
  }

  // Initialize the registry (startup only)
  async initialize() {
    if (this.initialized) {
      throw new Error("Registry already initialized")
    }

    // Set up adapters based on config
    this.adapters.set("mcp", createMCPAdapter(this.config.adapters.mcp))
    if (this.config.adapters.remote) {
      this.adapters.set("remote", createRemoteAdapter(this.config.adapters.remote))
    }

    // Initialize MCP tools
    await this.initializeMCPTools()

    this.initialized = true
  }

  // Get list of all available tool names
  getAvailableTools() {
    if (!this.initialized) {
      throw new Error("Registry not initialized")
    }
    return {
      custom: Array.from(this.customTools.keys()),
      mcp: Array.from(this.mcpTools.keys()),
      all: [...this.customTools.keys(), ...this.mcpTools.keys()],
    }
  }

  // Create tool instances for a specific context (separate instances per consumer)
  createToolInstances(selectedToolNames, executionContext = {}) {
    if (!this.initialized) {
      throw new Error("Cannot create tool instances before initialization")
    }

    const instances = new Map()

    for (const toolName of selectedToolNames) {
      // Check custom tools first
      if (this.customTools.has(toolName)) {
        const definition = this.customTools.get(toolName)
        instances.set(toolName, createCustomToolInstance(definition, executionContext))
        continue
      }

      // Check MCP tools
      if (this.mcpTools.has(toolName)) {
        const definition = this.mcpTools.get(toolName)
        instances.set(toolName, createMCPToolInstance(definition, executionContext))
        continue
      }

      // Tool not found
      if (this.config.validation.throwOnMissingTool) {
        throw new Error(`Tool not found: ${toolName}`)
      }
    }

    return instances
  }

  // Get AI SDK compatible tools object
  getAISDKTools(selectedToolNames, executionContext = {}) {
    const instances = this.createToolInstances(selectedToolNames, executionContext)
    const aiTools = {}

    for (const [name, instance] of instances) {
      aiTools[name] = instance.toAISDKTool()
    }

    return aiTools
  }
}

// ============================================================================
// 3. VALIDATION - Startup validation
// ============================================================================

function validateCustomTool(definition) {
  const errors = []

  if (!definition.name || typeof definition.name !== "string") {
    errors.push("Tool must have a string name")
  }

  if (!definition.description || typeof definition.description !== "string") {
    errors.push("Tool must have a description")
  }

  if (!definition.parameters) {
    errors.push("Tool must have parameters schema")
  }

  if (!definition.execute || typeof definition.execute !== "function") {
    errors.push("Tool must have an execute function")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function validateMCPTool(definition) {
  const errors = []

  if (!definition.name) {
    errors.push("MCP tool must have a name")
  }

  if (!definition.serverConfig) {
    errors.push("MCP tool must have server configuration")
  }

  if (!definition.connected) {
    errors.push("MCP tool server is not connected")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// 4. ADAPTERS - Pluggable tool sources
// ============================================================================

function createMCPAdapter(type) {
  if (type === "config-file") {
    return {
      async loadTools(mcpServers) {
        const tools = new Map()

        for (const [serverName, config] of Object.entries(mcpServers)) {
          if (!config.enabled) continue

          // Connect to MCP server
          const client = await connectToMCPServer(config)

          // Get available tools from server
          const serverTools = await client.listTools()

          for (const tool of serverTools) {
            const fullName = `${serverName}:${tool.name}`
            tools.set(fullName, {
              name: fullName,
              serverName,
              serverConfig: config,
              connected: true,
              inputSchema: tool.inputSchema,
              description: tool.description,
              client,
            })
          }
        }

        return tools
      },
    }
  }

  throw new Error(`Unknown MCP adapter type: ${type}`)
}

function createRemoteAdapter(_type) {
  // Future: API-based, gRPC-based, etc.
  throw new Error("Remote adapters not yet implemented")
}

// ============================================================================
// 5. TOOL INSTANCES - Separate instances per consumer
// ============================================================================

function createCustomToolInstance(definition, executionContext) {
  // Each consumer gets its own instance with its own context
  return {
    name: definition.name,
    type: "custom",
    context: executionContext,

    async execute(parameters) {
      // Execute with bound context
      return await definition.execute(parameters, this.context)
    },

    // Convert to AI SDK tool format
    toAISDKTool() {
      // This returns an object compatible with AI SDK's tool() function
      return {
        description: definition.description,
        parameters: definition.parameters,
        execute: this.execute.bind(this),
      }
    },

    cleanup: definition.cleanup || null,
  }
}

function createMCPToolInstance(definition, executionContext) {
  return {
    name: definition.name,
    type: "mcp",
    context: executionContext,

    async execute(parameters) {
      // Execute via MCP client
      return await definition.client.executeTool({
        name: definition.name,
        parameters,
        context: this.context,
      })
    },

    // Convert to AI SDK tool format
    toAISDKTool() {
      return {
        description: definition.description,
        parameters: definition.inputSchema,
        execute: this.execute.bind(this),
      }
    },

    async cleanup() {
      // MCP clients are shared, no per-instance cleanup needed
    },
  }
}

// ============================================================================
// 6. USAGE WITH AI SDK - How consumers use this
// ============================================================================

async function exampleUsage() {
  // Step 1: Create and configure registry
  const registry = new ToolRegistry(toolSystemConfig)

  // Step 2: Register custom tools manually
  registry.registerCustomTool({
    name: "get-weather",
    description: "Get weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name" },
      },
      required: ["location"],
    },
    async execute(params, context) {
      console.log(`Getting weather for ${params.location}`)
      console.log("Execution context:", context)
      return {
        location: params.location,
        temperature: 72,
        conditions: "sunny",
      }
    },
  })

  registry.registerCustomTool({
    name: "send-email",
    description: "Send an email",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email" },
        subject: { type: "string", description: "Email subject" },
        body: { type: "string", description: "Email body" },
      },
      required: ["to", "subject", "body"],
    },
    async execute(params, context) {
      console.log(`Sending email to ${params.to}`)
      console.log("Execution context:", context)
      return { sent: true, messageId: "abc123" }
    },
  })

  // Step 3: Initialize registry (validates everything, connects MCP servers)
  await registry.initialize()

  console.log("✅ Registry initialized")
  console.log("Available tools:", registry.getAvailableTools())

  // ========================================================================
  // SCENARIO 1: Consumer A wants weather and email tools
  // ========================================================================

  const consumerAContext = {
    consumerId: "consumer-A",
    userId: "user-123",
    sessionId: "session-456",
  }

  const consumerATools = registry.getAISDKTools(["get-weather", "send-email"], consumerAContext)

  console.log("\n--- Consumer A Tools ---")
  console.log("Tool names:", Object.keys(consumerATools))

  // Use with AI SDK
  // const result = await generateText({
  //   model: openai('gpt-4'),
  //   tools: consumerATools,
  //   prompt: "What's the weather in NYC and email me a summary?"
  // })

  // Direct execution for demonstration
  const weatherA = await consumerATools["get-weather"].execute({
    location: "NYC",
  })
  console.log("Consumer A weather result:", weatherA)

  // ========================================================================
  // SCENARIO 2: Consumer B wants only weather tool (separate instance!)
  // ========================================================================

  const consumerBContext = {
    consumerId: "consumer-B",
    userId: "user-789",
    sessionId: "session-999",
  }

  const consumerBTools = registry.getAISDKTools(
    ["get-weather"], // Only weather
    consumerBContext,
  )

  console.log("\n--- Consumer B Tools ---")
  console.log("Tool names:", Object.keys(consumerBTools))

  // This is a SEPARATE INSTANCE from Consumer A's weather tool
  const weatherB = await consumerBTools["get-weather"].execute({
    location: "LA",
  })
  console.log("Consumer B weather result:", weatherB)

  // Consumer B doesn't have send-email
  if (!consumerBTools["send-email"]) {
    console.log("✓ Consumer B correctly does not have send-email tool")
  }

  // ========================================================================
  // SCENARIO 3: Invalid tool name throws error
  // ========================================================================

  try {
    registry.getAISDKTools(["nonexistent-tool"], consumerAContext)
  } catch (error) {
    console.log("\n✓ Expected error for nonexistent tool:", error.message)
  }

  // ========================================================================
  // SCENARIO 4: Registry info
  // ========================================================================

  console.log("\n--- Registry Info ---")
  const available = registry.getAvailableTools()
  console.log(`Total tools: ${available.all.length}`)
  console.log(`Custom tools: ${available.custom.length}`)
  console.log(`MCP tools: ${available.mcp.length}`)
}

// ============================================================================
// MOCK IMPLEMENTATIONS (for demonstration)
// ============================================================================

async function connectToMCPServer(config) {
  // Mock implementation - would use actual MCP SDK
  console.log(`Connecting to MCP server: ${config.command} ${config.args.join(" ")}`)

  return {
    async listTools() {
      return [
        {
          name: "navigate",
          description: "Navigate to a URL",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL to navigate to" },
            },
            required: ["url"],
          },
        },
        {
          name: "screenshot",
          description: "Take a screenshot",
          inputSchema: {
            type: "object",
            properties: {
              selector: { type: "string", description: "CSS selector" },
            },
          },
        },
      ]
    },
    async executeTool({ name, parameters, context }) {
      console.log(`Executing MCP tool ${name} with context:`, context)
      return {
        success: true,
        result: `Executed ${name} with ${JSON.stringify(parameters)}`,
      }
    },
  }
}

// Run the example
if (require.main === module) {
  exampleUsage().catch(console.error)
}

module.exports = {
  ToolRegistry,
  validateCustomTool,
  validateMCPTool,
  createMCPAdapter,
  createCustomToolInstance,
  createMCPToolInstance,
}
