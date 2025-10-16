import { requireAuth } from "@/lib/api-auth"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"

// Validation schema for MCP server config
const mcpServerConfigSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()),
  env: z.record(z.string()).optional(),
})

const mcpConfigSchema = z.object({
  mcpServers: z.record(z.string(), mcpServerConfigSchema),
})

/**
 * GET /api/mcp/config
 * Returns the user's MCP server configurations from mcp.user_server_configs (stdio servers only)
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()

  try {
    const { data, error } = await supabase
      .schema("mcp")
      .from("user_server_configs")
      .select("name, config_json, enabled")
      .eq("user_id", clerkId)
      .is("server_id", null) // Only stdio servers (not marketplace servers)
      .eq("enabled", true)

    if (error) {
      return NextResponse.json({ error: `Failed to fetch MCP configs: ${error.message}` }, { status: 500 })
    }

    // Transform rows into { mcpServers: { name: config } } format
    const mcpServers: Record<string, any> = {}
    for (const row of data || []) {
      mcpServers[row.name] = row.config_json
    }

    return NextResponse.json({ mcpServers })
  } catch (e: any) {
    logException(e, {
      location: "/api/mcp/config/GET",
    })
    return NextResponse.json({ error: e?.message ?? "Failed to load MCP configs" }, { status: 500 })
  }
}

/**
 * POST /api/mcp/config
 * Body: { mcpServers: Record<string, MCPServerConfig> }
 * Saves the user's MCP server configurations to mcp.user_server_configs (stdio servers only)
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Validate request body
  const validation = mcpConfigSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid MCP config format", details: validation.error.format() },
      { status: 400 },
    )
  }

  const { mcpServers } = validation.data

  try {
    // Get existing stdio configs (server_id IS NULL)
    const { data: existing, error: fetchErr } = await supabase
      .schema("mcp")
      .from("user_server_configs")
      .select("usco_id, name")
      .eq("user_id", clerkId)
      .is("server_id", null)

    if (fetchErr) {
      return NextResponse.json({ error: `Failed to fetch existing configs: ${fetchErr.message}` }, { status: 500 })
    }

    const existingNames = new Set((existing || []).map(row => row.name))
    const incomingNames = new Set(Object.keys(mcpServers))

    // Determine operations
    const toInsert: Array<{ name: string; config: any }> = []
    const toUpdate: Array<{ name: string; config: any }> = []
    const toDelete: string[] = []

    // Find inserts and updates
    for (const [name, config] of Object.entries(mcpServers)) {
      if (existingNames.has(name)) {
        toUpdate.push({ name, config })
      } else {
        toInsert.push({ name, config })
      }
    }

    // Find deletes (servers that were removed)
    for (const name of existingNames) {
      if (!incomingNames.has(name)) {
        toDelete.push(name)
      }
    }

    // Execute operations
    const operations: Promise<any>[] = []

    // Insert new servers
    if (toInsert.length > 0) {
      const insertData = toInsert.map(({ name, config }) => ({
        user_id: clerkId,
        name,
        config_json: config,
        secrets_json: {}, // Empty secrets for stdio servers
        server_id: null, // NULL for stdio servers
        enabled: true,
      }))

      operations.push(
        supabase
          .schema("mcp")
          .from("user_server_configs")
          .insert(insertData)
      )
    }

    // Update existing servers
    for (const { name, config } of toUpdate) {
      operations.push(
        supabase
          .schema("mcp")
          .from("user_server_configs")
          .update({ config_json: config, updated_at: new Date().toISOString() })
          .eq("user_id", clerkId)
          .eq("name", name)
          .is("server_id", null)
      )
    }

    // Delete removed servers
    if (toDelete.length > 0) {
      operations.push(
        supabase
          .schema("mcp")
          .from("user_server_configs")
          .delete()
          .eq("user_id", clerkId)
          .in("name", toDelete)
          .is("server_id", null)
      )
    }

    // Execute all operations
    const results = await Promise.all(operations)

    // Check for errors
    for (const result of results) {
      if (result.error) {
        return NextResponse.json({ error: `Operation failed: ${result.error.message}` }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      inserted: toInsert.length,
      updated: toUpdate.length,
      deleted: toDelete.length,
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/mcp/config/POST",
    })
    return NextResponse.json({ error: e?.message ?? "Failed to save MCP configs" }, { status: 500 })
  }
}
