import { requireAuth } from "@/lib/api-auth"
import { decryptGCM, encryptGCM, normalizeNamespace } from "@/lib/crypto/lockbox"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"

const MCP_CONFIG_NAME = "servers"
const MCP_CONFIG_NAMESPACE = "mcp"

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
 * Returns the user's MCP server configuration from lockbox
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()
  const ns = normalizeNamespace(MCP_CONFIG_NAMESPACE)

  try {
    const { data, error } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .select("ciphertext, iv, auth_tag, user_secret_id")
      .eq("clerk_id", clerkId)
      .eq("namespace", ns)
      .eq("name", MCP_CONFIG_NAME)
      .eq("is_current", true)
      .is("deleted_at", null)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: `Failed to fetch MCP config: ${error.message}` }, { status: 500 })
    }

    if (!data) {
      // No config stored yet, return empty config
      return NextResponse.json({ mcpServers: {} })
    }

    // Decrypt and parse
    const configJson = decryptGCM({
      ciphertext: data.ciphertext as any,
      iv: data.iv as any,
      authTag: data.auth_tag as any,
    })

    const config = JSON.parse(configJson)

    // Update last_used_at
    await supabase
      .schema("lockbox")
      .from("user_secrets")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_secret_id", data.user_secret_id)

    return NextResponse.json(config)
  } catch (e: any) {
    logException(e, {
      location: "/api/mcp/config/GET",
    })
    return NextResponse.json({ error: e?.message ?? "Failed to load MCP config" }, { status: 500 })
  }
}

/**
 * POST /api/mcp/config
 * Body: { mcpServers: Record<string, MCPServerConfig> }
 * Saves the user's MCP server configuration to lockbox
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

  const ns = normalizeNamespace(MCP_CONFIG_NAMESPACE)

  try {
    // Serialize and encrypt the entire config
    const configJson = JSON.stringify({ mcpServers })
    const { ciphertext, iv, authTag } = encryptGCM(configJson)

    // Determine next version
    const { data: verData, error: verErr } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .select("version")
      .eq("clerk_id", clerkId)
      .eq("namespace", ns)
      .eq("name", MCP_CONFIG_NAME)
      .order("version", { ascending: false })
      .limit(1)

    if (verErr) {
      return NextResponse.json({ error: `Version lookup failed: ${verErr.message}` }, { status: 500 })
    }

    const nextVersion = (verData?.[0]?.version ?? 0) + 1

    // Mark previous current as not current
    const { error: updErr } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .update({ is_current: false })
      .eq("clerk_id", clerkId)
      .eq("namespace", ns)
      .eq("name", MCP_CONFIG_NAME)
      .eq("is_current", true)

    if (updErr && updErr.code !== "PGRST116") {
      return NextResponse.json({ error: `Failed to update previous versions: ${updErr.message}` }, { status: 500 })
    }

    // Insert new version
    const { data, error } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .insert([
        {
          clerk_id: clerkId,
          name: MCP_CONFIG_NAME,
          namespace: ns,
          version: nextVersion,
          ciphertext,
          iv,
          auth_tag: authTag,
          is_current: true,
          created_by: clerkId,
          updated_by: clerkId,
        } as any,
      ])
      .select("user_secret_id, version, created_at")
      .single()

    if (error) {
      return NextResponse.json({ error: `Insert failed: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: data.user_secret_id,
      version: data.version,
      createdAt: data.created_at,
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/mcp/config/POST",
    })
    return NextResponse.json({ error: e?.message ?? "Failed to save MCP config" }, { status: 500 })
  }
}
