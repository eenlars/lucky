import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import dotenv from "dotenv"
import { getRandomWebshareProxy } from "./functions.js"

dotenv.config()

const webshareApiKey = process.env.WEBSHARE_API_KEY

if (!webshareApiKey) {
  console.error("WEBSHARE_API_KEY is not set")
  throw new Error("WEBSHARE_API_KEY is not set")
}

// ---- MCP Server Definition ----
const server = new McpServer({
  name: "webshare-proxy",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
})

// tool: get-random-proxy
server.tool(
  "get-proxy",
  "Fetch a single random proxy URL from Webshare",
  // no inputs
  async () => {
    try {
      const proxyUrl = await getRandomWebshareProxy()
      return {
        content: [{ type: "text", text: proxyUrl }],
      }
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `Error fetching random proxy: ${err.message}` }],
      }
    }
  },
)

// ---- Start the server ----

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("Webshare MCP Server running on stdio")
}

main().catch(error => {
  console.error("Fatal error in Webshare MCP Server:", error)
  process.exit(1)
})
