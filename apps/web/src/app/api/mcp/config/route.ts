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
  lastKnownUpdateAt: z.string().datetime().optional(), // For optimistic concurrency control
})

/**
 * GET /api/mcp/config
 * Returns the user's MCP server configurations from mcp.user_server_configs (stdio servers only)
 */
export async function GET(_req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()

  try {
    const { data, error } = await supabase
      .schema("mcp")
      .from("user_server_configs")
      .select("name, config_json, secrets_json, enabled, updated_at")
      .eq("user_id", clerkId)
      .is("server_id", null) // Only stdio servers (not marketplace servers)
      .eq("enabled", true)
      .order("updated_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: `Failed to fetch MCP configs: ${error.message}` }, { status: 500 })
    }

    // Transform rows into { mcpServers: { name: config } } format
    // Merge config_json (command, args) with secrets_json (env vars)
    const mcpServers: Record<string, any> = {}
    let latestUpdateAt: string | null = null
    for (const row of data || []) {
      // Merge public config with secrets (env vars stored separately for encryption)
      const configJson = row.config_json as Record<string, any>
      const secretsJson = row.secrets_json as Record<string, any> | null
      mcpServers[row.name] = {
        ...configJson,
        ...(secretsJson?.env ? { env: secretsJson.env } : {}),
      }
      if (!latestUpdateAt || row.updated_at > latestUpdateAt) {
        latestUpdateAt = row.updated_at
      }
    }

    // Only include lastKnownUpdateAt if we have data (prevents null validation issues)
    const response: { mcpServers: Record<string, any>; lastKnownUpdateAt?: string } = { mcpServers }
    if (latestUpdateAt) {
      response.lastKnownUpdateAt = latestUpdateAt
    }

    return NextResponse.json(response)
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
    // Include both enabled and disabled servers to avoid deleting disabled ones
    const { data: existing, error: fetchErr } = await supabase
      .schema("mcp")
      .from("user_server_configs")
      .select("usco_id, name, enabled, updated_at")
      .eq("user_id", clerkId)
      .is("server_id", null)

    if (fetchErr) {
      return NextResponse.json({ error: `Failed to fetch existing configs: ${fetchErr.message}` }, { status: 500 })
    }

    // Note: We use database-level conditional updates (WHERE updated_at = original_value)
    // instead of application-level optimistic locking to eliminate race conditions.
    // The lastKnownUpdateAt is kept for client-side staleness detection but not enforced here.

    // Create maps for efficient lookups
    const existingMap = new Map((existing || []).map(row => [row.name, row]))
    const existingEnabled = new Set((existing || []).filter(row => row.enabled).map(row => row.name))
    const incomingNames = new Set(Object.keys(mcpServers))

    // Determine operations
    const toInsert: Array<{ name: string; config: any }> = []
    const toUpdate: Array<{ name: string; config: any; originalUpdatedAt: string }> = []
    const toDelete: string[] = []

    // Find inserts and updates
    for (const [name, config] of Object.entries(mcpServers)) {
      if (existingEnabled.has(name)) {
        const existingRow = existingMap.get(name)!
        toUpdate.push({ name, config, originalUpdatedAt: existingRow.updated_at })
      } else {
        toInsert.push({ name, config })
      }
    }

    // Find deletes (only delete enabled servers that were removed)
    // Preserve disabled servers to avoid unintentional deletion
    for (const name of existingEnabled) {
      if (!incomingNames.has(name)) {
        toDelete.push(name)
      }
    }

    // Execute operations
    const insertPromises: PromiseLike<any>[] = []
    const deletePromises: PromiseLike<any>[] = []

    // Insert new servers
    if (toInsert.length > 0) {
      const insertData = toInsert.map(({ name, config }) => {
        // Split config: public parts (command, args) vs secrets (env)
        const { env, ...publicConfig } = config
        return {
          user_id: clerkId,
          name,
          config_json: publicConfig, // Only command and args
          secrets_json: env ? { env } : {}, // Environment variables stored separately for encryption
          server_id: null, // NULL for stdio servers
          enabled: true,
        }
      })

      insertPromises.push(supabase.schema("mcp").from("user_server_configs").insert(insertData))
    }

    // Update existing servers with conditional WHERE on updated_at (prevents race conditions)
    const updatePromises = toUpdate.map(async ({ name, config, originalUpdatedAt }) => {
      // Split config: public parts (command, args) vs secrets (env)
      const { env, ...publicConfig } = config
      const result = await supabase
        .schema("mcp")
        .from("user_server_configs")
        .update({
          config_json: publicConfig,
          secrets_json: env ? { env } : {},
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", clerkId)
        .eq("name", name)
        .eq("updated_at", originalUpdatedAt) // Conditional update: only if not modified by someone else
        .is("server_id", null)
        .select()

      // Check if update affected any rows
      if (!result.error && (!result.data || result.data.length === 0)) {
        return {
          error: { message: `Server "${name}" was modified by another client` },
          conflictedServer: name,
        }
      }

      return result
    })

    // Delete removed servers
    if (toDelete.length > 0) {
      deletePromises.push(
        supabase
          .schema("mcp")
          .from("user_server_configs")
          .delete()
          .eq("user_id", clerkId)
          .in("name", toDelete)
          .is("server_id", null),
      )
    }

    // Execute all operations
    const allPromises = [...insertPromises, ...updatePromises, ...deletePromises]
    const results = await Promise.all(allPromises)

    // Check for errors and conflicts
    for (const result of results) {
      if (result.error) {
        const isConflict = "conflictedServer" in result
        if (isConflict) {
          return NextResponse.json(
            {
              error: result.error.message,
              conflictedServer: result.conflictedServer,
              code: "CONCURRENT_MODIFICATION",
            },
            { status: 409 },
          )
        }
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
