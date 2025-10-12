"use server"
import { createClient } from "@/lib/supabase/server"
import { clerkClient } from "@clerk/nextjs/server"
import type { IamDatabase } from "@lucky/shared/client"

/**
 * Ensures there is a row in iam.users for the given Clerk user.
 * Idempotent: upserts by unique clerk_id.
 */
export async function syncIamUser(clerkUserId: string) {
  if (!clerkUserId) return

  const clerk = await clerkClient()
  if (!clerk) return

  // Fetch user details from Clerk
  const user = await clerk.users.getUser(clerkUserId)
  if (!user) return

  const email = user.primaryEmailAddress?.emailAddress ?? null
  const displayName = user.fullName ?? user.username ?? null
  const avatarUrl = user.imageUrl ?? null

  const supabase = await createClient()

  const upsertable = {
    clerk_id: clerkUserId,
    email,
    display_name: displayName,
    avatar_url: avatarUrl,
    status: "active" as const,
    updated_at: new Date().toISOString(),
  } satisfies IamDatabase["iam"]["Tables"]["users"]["Update"]

  // Upsert into iam.users by user_id
  const { error } = await supabase.schema("iam").from("users").upsert(upsertable, { onConflict: "clerk_id" })

  if (error) {
    // Swallow error to avoid blocking navigation, but log for diagnostics
    console.error("Failed to sync iam.users from Clerk:", error)
  }
}
