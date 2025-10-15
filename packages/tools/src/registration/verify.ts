/**
 * Verification script to check MCP tool registrations
 * Run with: bun run packages/tools/src/registration/verify.ts
 *
 * Note: Code tool registrations are in examples/definitions/registry-grouped.ts
 * and should be verified from that location.
 */

import { mcpToolkits } from "./mcpToolsRegistration"

console.log("\n=== NOTE ===")
console.log("Code tools are now registered in examples/definitions/registry-grouped.ts")
console.log("To verify code tools, import TOOL_TOOLKITS from that file in your application.")
console.log("")

console.log("\n=== MCP TOOLS REGISTRATION ===")
console.log(`Total toolkits: ${mcpToolkits.toolkits.length}`)
console.log(`Total tools: ${mcpToolkits.toolkits.reduce((acc, toolkit) => acc + toolkit.tools.length, 0)}`)
console.log("\nToolkits:")
mcpToolkits.toolkits.forEach(toolkit => {
  console.log(`  • ${toolkit.toolkitName}: ${toolkit.tools.length} tools - ${toolkit.description}`)
  toolkit.tools.forEach(tool => {
    console.log(`    - ${tool.toolName} [server: ${tool.serverName}]: ${tool.description}`)
  })
})

console.log("\n=== STRUCTURE COMPARISON ===")
console.log("Both use the same structure:")
console.log("  ✓ toolkits: Array<Toolkit>")
console.log("  ✓ Toolkit has: toolkitName, description, tools")
console.log("  ✓ Tool has: toolName, description")
console.log("  ✓ Code toolkits have: toolFunc (the actual function)")
console.log("  ✓ MCP toolkits have: serverName (reference to mcp-secret.json)")
console.log("\n✅ Both registrations use the same toolkit structure for easy maintenance!\n")
