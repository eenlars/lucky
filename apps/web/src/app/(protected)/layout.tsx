import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let userId: string | null = null
  try {
    const result = await auth()
    userId = result?.userId ?? null
  } catch {
    // If Clerk middleware context is missing or misconfigured, treat as unauthenticated
    userId = null
  }

  if (!userId) {
    redirect("/sign-in")
  }

  return <>{children}</>
}
