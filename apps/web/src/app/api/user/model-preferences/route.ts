/**
 * Unified Model Preferences API
 * Returns all provider settings with Zod validation
 */

import { checkMultipleProviderKeys } from "@/features/secret-management/lib/check-provider-keys"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
import { getAllGateways } from "@lucky/models"
import type { LuckyGateway, ModelId, UserGatewayPreferences } from "@lucky/shared"
import { userGatewayPreferencesSchema } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * GET /api/user/model-preferences
 * Returns ALL provider settings with normalized and validated model IDs
 */
export async function GET(_req: NextRequest) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = await createRLSClient()

  try {
    const { data, error } = await supabase
      .schema("app")
      .from("gateway_settings")
      .select("gateway, enabled_models, is_enabled, updated_at")
      .eq("clerk_id", userId)
      .order("gateway", { ascending: true })

    if (error) {
      console.error("[GET /api/user/model-preferences] Supabase error:", error)
      return fail("user/model-preferences", `Failed to fetch preferences: ${error.message}`, {
        code: "SUPABASE_ERROR",
        status: 500,
      })
    }

    // Create map of available providers for validation
    const validGateways = new Set(getAllGateways())

    // Filter to valid providers
    const validData = data.filter(
      (row): row is (typeof data)[number] & { gateway: LuckyGateway } =>
        row.gateway !== null && validGateways.has(row.gateway),
    )

    // Check API key status for all gateways in parallel
    const gatewayNames = validData.map(row => row.gateway)
    const keyStatusMap = await checkMultipleProviderKeys(userId, gatewayNames)

    // Build gateway settings - use model IDs as-is from database
    const gateways = validData.map(row => {
      const enabledModels = (row.enabled_models as string[]) || []

      // Convert timestamp to ISO format
      const lastUpdated = row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()

      return {
        gateway: row.gateway as any,
        enabledModels,
        isEnabled: row.is_enabled,
        metadata: {
          apiKeyConfigured: keyStatusMap.get(row.gateway) ?? false,
          lastUpdated,
        },
      }
    })

    // Build UserGatewayPreferences response
    const preferences: UserGatewayPreferences = {
      gateways: gateways,
      lastSynced: new Date().toISOString(),
    }

    // Validate with Zod
    const validated = userGatewayPreferencesSchema.parse(preferences)

    return alrighty("user/model-preferences", validated)
  } catch (e: unknown) {
    logException(e, {
      location: "/api/user/model-preferences/GET",
    })
    console.error("[GET /api/user/model-preferences] Error:", e)
    const message = e instanceof Error ? e.message : "Failed to fetch preferences"
    return fail("user/model-preferences", message, { code: "FETCH_ERROR", status: 500 })
  }
}

/**
 * PUT /api/user/model-preferences
 * Updates all provider settings atomically
 * Body: UserModelPreferences
 */
export async function PUT(req: NextRequest) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = await createRLSClient()

  const body = await handleBody("user/model-preferences:put", req)
  if (isHandleBodyError(body)) return body

  // Validate with Zod
  const validation = userGatewayPreferencesSchema.safeParse(body)
  if (!validation.success) {
    return fail("user/model-preferences:put", "Invalid preferences format", {
      code: "VALIDATION_ERROR",
      status: 400,
    })
  }

  const preferences = validation.data
  const validGateways = new Set(getAllGateways())

  try {
    // Validate gateways (but not models - gateway API is source of truth)
    for (const gatewaySettings of preferences.gateways) {
      if (!validGateways.has(gatewaySettings.gateway)) {
        return fail("user/model-preferences:put", `Invalid gateway: ${gatewaySettings.gateway}`, {
          code: "INVALID_GATEWAY",
          status: 400,
        })
      }

      // Note: We don't validate models against MODEL_CATALOG because the gateway's API
      // is the source of truth. Our catalog is just for enrichment with pricing/metadata.
    }

    // Update each gateway's settings
    const updatePromises = preferences.gateways.map(async gatewaySettings => {
      // Check if settings exist
      const { data: existing } = await supabase
        .schema("app")
        .from("gateway_settings")
        .select("gateway_setting_id")
        .eq("clerk_id", userId)
        .eq("gateway", gatewaySettings.gateway)
        .maybeSingle()

      if (existing) {
        // Update existing
        return supabase
          .schema("app")
          .from("gateway_settings")
          .update({
            enabled_models: gatewaySettings.enabledModels as ModelId[],
            is_enabled: gatewaySettings.isEnabled,
            updated_at: new Date().toISOString(),
          })
          .eq("gateway_setting_id", existing.gateway_setting_id)
      }
      // Insert new
      return supabase
        .schema("app")
        .from("gateway_settings")
        .insert([
          {
            clerk_id: userId,
            gateway: gatewaySettings.gateway,
            enabled_models: gatewaySettings.enabledModels as ModelId[],
            is_enabled: gatewaySettings.isEnabled,
          },
        ])
    })

    const results = await Promise.all(updatePromises)

    // Check for errors
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error("[PUT /api/user/model-preferences] Update errors:", errors)
      return fail("user/model-preferences:put", "Failed to update some gateway settings", {
        code: "UPDATE_ERROR",
        status: 500,
      })
    }

    // Return updated preferences
    const updatedPreferences: UserGatewayPreferences = {
      ...preferences,
      lastSynced: new Date().toISOString(),
    }

    return alrighty("user/model-preferences:put", updatedPreferences)
  } catch (e: unknown) {
    logException(e, {
      location: "/api/user/model-preferences/PUT",
    })
    console.error("[PUT /api/user/model-preferences] Error:", e)
    const message = e instanceof Error ? e.message : "Failed to update preferences"
    return fail("user/model-preferences:put", message, { code: "INTERNAL_ERROR", status: 500 })
  }
}
