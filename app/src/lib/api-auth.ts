import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function requireAuth() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return userId
}

export async function requireAdmin() {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user has admin role
  const isAdmin = (sessionClaims as any)?.metadata?.role === 'admin' || 
                  (sessionClaims as any)?.role === 'admin' ||
                  process.env.ADMIN_USERS?.split(',').includes(userId)

  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  return userId
}
