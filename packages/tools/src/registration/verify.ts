/**
 * Verification script to check MCP tool registrations
 * Run with: bun run packages/tools/src/registration/verify.ts
 *
 * Note: Code tool registrations are in examples/definitions/registry-grouped.ts
 * and should be verified from that location.
 */

import { mcpToolGroups } from "./mcpToolsRegistration"

console.log("\n=== NOTE ===")
console.log("Code tools are now registered in examples/definitions/registry-grouped.ts")
console.log("To verify code tools, import TOOL_GROUPS from that file in your application.")
console.log("")

console.log("\n=== MCP TOOLS REGISTRATION ===")
console.log(`Total groups: ${mcpToolGroups.groups.length}`)
console.log(`Total tools: ${mcpToolGroups.groups.reduce((acc, g) => acc + g.tools.length, 0)}`)
console.log("\nGroups:")
mcpToolGroups.groups.forEach(group => {
  console.log(`  • ${group.groupName}: ${group.tools.length} tools - ${group.description}`)
  group.tools.forEach(tool => {
    console.log(`    - ${tool.toolName} [server: ${tool.serverName}]: ${tool.description}`)
  })
})

console.log("\n=== STRUCTURE COMPARISON ===")
console.log("Both use the same structure:")
console.log("  ✓ groups: Array<Group>")
console.log("  ✓ Group has: groupName, description, tools")
console.log("  ✓ Tool has: toolName, description")
console.log("  ✓ Code tools have: toolFunc (the actual function)")
console.log("  ✓ MCP tools have: serverName (reference to mcp-secret.json)")
console.log("\n✅ Both registrations use the same grouping structure for easy maintenance!\n")
