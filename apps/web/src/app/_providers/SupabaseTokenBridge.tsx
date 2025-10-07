"use client"

import { registerSupabaseTokenGetter } from "@/lib/supabase/client"
import { useSession } from "@clerk/nextjs"
import { useEffect } from "react"

/**
 * Bridges Clerk session tokens to Supabase client
 * Keeps the token getter fresh as session changes
 */
export function SupabaseTokenBridge() {
  const { session } = useSession()

  useEffect(() => {
    registerSupabaseTokenGetter(async () => {
      if (!session) return null
      return session.getToken({ skipCache: true })
    })
  }, [session])

  return null
}
