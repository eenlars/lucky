import { envi } from "@/env.mjs"
import { createStandaloneClient } from "@/lib/supabase/standalone"
import type { Database } from "@lucky/shared/client"
import type { UserWebhookEvent } from "@clerk/backend"
import { Webhook } from "svix"

type UserData = Extract<UserWebhookEvent, { type: "user.created" | "user.updated" }>["data"]

// Extended webhook event with instance_id field (not in official Clerk types)
type ClerkWebhookEvent = UserWebhookEvent & {
	instance_id?: string
}

function getEmailFromEvent(data: UserData): string | null {
  const primaryId = data.primary_email_address_id
  const addrs = data.email_addresses
  if (!primaryId || !Array.isArray(addrs)) return null
  const match = addrs.find((a) => a.id === primaryId)
  return match?.email_address ?? null
}

function getDisplayName(data: UserData): string | null {
  const first = data.first_name?.trim() || ""
  const last = data.last_name?.trim() || ""
  const full = `${first} ${last}`.trim()
  return full || data.username || null
}

export async function POST(req: Request) {
  const svixId = req.headers.get("svix-id")
  const svixTimestamp = req.headers.get("svix-timestamp")
  const svixSignature = req.headers.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 })
  }

  const payload = await req.text()
  const secret = envi.CLERK_WEBHOOK_SECRET ?? envi.CLERK_SECRET_KEY

  let evt: ClerkWebhookEvent
  try {
    const wh = new Webhook(secret)
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error("Webhook verification failed:", err)
    return new Response("Invalid signature", { status: 400 })
  }

  try {
    const eventType = evt.type
    const clerkId = evt.data.id

    if (!clerkId) return new Response("No user id", { status: 400 })

    // Use service role key to bypass RLS - webhooks don't have user sessions
    const supabase = createStandaloneClient(true)

    // Detect test environment: only trust server-side indicators
    const isTestEnv = evt.instance_id === "ins_test123" || process.env.NODE_ENV !== "production"

    if (eventType === "user.deleted") {
      const { error } = await supabase
        .schema("iam")
        .from("users")
        .update({ status: "disabled", updated_at: new Date().toISOString() })
        .eq("clerk_id", clerkId)
      if (error) {
        console.error("iam.users disable failed:", error)
        return new Response("Database update failed", { status: 500 })
      }
      return new Response("ok", { status: 200 })
    }

    // Type guard: if not deleted, data is UserData
    if (eventType !== "user.created" && eventType !== "user.updated") {
      return new Response("Unsupported event type", { status: 400 })
    }

    const data = evt.data as UserData
    const email = getEmailFromEvent(data)
    const displayName = getDisplayName(data)
    const avatarUrl = data.image_url ?? null

    const { error } = await supabase
      .schema("iam")
      .from("users")
      .upsert(
        {
          clerk_id: clerkId,
          email,
          display_name: displayName,
          avatar_url: avatarUrl,
          status: "active",
          is_test_env: isTestEnv,
          updated_at: new Date().toISOString(),
        } satisfies Database["iam"]["Tables"]["users"]["Insert"],
        { onConflict: "clerk_id" },
      )
    if (error) {
      console.error("iam.users upsert failed:", error)
      return new Response("Database upsert failed", { status: 500 })
    }
    return new Response("ok", { status: 200 })
  } catch (err) {
    console.error("Webhook processing error:", err)
    return new Response("Internal server error", { status: 500 })
  }
}
