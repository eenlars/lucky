#!/usr/bin/env bun
/**
 * Integration test for Composio MCP server
 * Tests that the MCP server can be initialized and tools can be discovered
 */

import fs from "node:fs"
import path from "node:path"
import { logMCPStatus, setupMCPForNode } from "@lucky/tools"

async function testComposioMCP() {
  console.log("=".repeat(80))
  console.log("COMPOSIO MCP INTEGRATION TEST")
  console.log("=".repeat(80))

  // Set MCP_SECRET_PATH to our config
  const configPath = path.join(process.cwd(), "apps/examples/mcp-secret.json")
  process.env.MCP_SECRET_PATH = configPath
  console.log(`\n📁 Using MCP config: ${configPath}\n`)

  // Log MCP status
  logMCPStatus()

  try {
    console.log("🚀 Initializing Composio MCP server...")
    console.log("   This may take 30-60 seconds on first run (npx downloads package)\n")

    // Setup MCP for Composio with a 2-minute timeout
    const tools = await setupMCPForNode(["composio" as any], "test-composio-workflow")

    console.log(`\n${"=".repeat(80)}`)
    console.log("✅ SUCCESS: Composio MCP server initialized")
    console.log("=".repeat(80))

    // List discovered tools
    const toolNames = Object.keys(tools)
    console.log(`\n📊 Discovered ${toolNames.length} tool(s):\n`)

    if (toolNames.length === 0) {
      console.warn("⚠️  WARNING: No tools discovered. This may indicate:")
      console.warn("   - Composio API credentials are invalid")
      console.warn("   - Composio MCP server is not configured correctly")
      console.warn("   - Network connectivity issues")
    } else {
      // Create tool-specs directory
      const toolSpecsDir = path.join(process.cwd(), "tool-specs")
      if (!fs.existsSync(toolSpecsDir)) {
        fs.mkdirSync(toolSpecsDir, { recursive: true })
      }
      console.log(`📁 Saving tool specs to: ${toolSpecsDir}\n`)

      // Print each tool with details
      for (const [name, tool] of Object.entries(tools)) {
        console.log(`🔧 ${name}`)
        console.log(`   Description: ${tool.description || "(no description)"}`)

        // Write comprehensive tool specification to file in tool-specs directory
        const toolSpecPath = path.join(toolSpecsDir, `${name}.json`)

        try {
          await Bun.write(toolSpecPath, JSON.stringify(tool, null, 2))
          console.log(`   📄 Specification saved to: ${toolSpecPath}`)
        } catch (writeError) {
          console.warn(`   ⚠️  Failed to write specification: ${writeError}`)
        }

        // Show input schema
        if (tool.inputSchema) {
          const schema = tool.inputSchema as any
          if (schema.shape) {
            const params = Object.keys(schema.shape)
            if (params.length > 0) {
              console.log(`   Parameters: ${params.join(", ")}`)
            }
          }
        }
        console.log()
      }
    }

    console.log("=".repeat(80))
    console.log("TEST COMPLETED SUCCESSFULLY")
    console.log("=".repeat(80))

    process.exit(0)
  } catch (error) {
    console.error(`\n${"=".repeat(80)}`)
    console.error("❌ FAILURE: Composio MCP initialization failed")
    console.error("=".repeat(80))
    console.error("\n💥 Error details:")
    console.error(error)
    console.error("\n📝 Troubleshooting:")
    console.error("   1. Verify npx is installed: which npx")
    console.error("   2. Verify Composio API credentials are correct")
    console.error("   3. Check network connectivity")
    console.error("   4. Try running manually: npx composio/mcp@latest")
    console.error("=".repeat(80))
    process.exit(1)
  }
}

// Run the test
testComposioMCP()
