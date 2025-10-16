import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let isAuthenticated = false
  try {
    const result = await auth()
    isAuthenticated = result?.isAuthenticated ?? false
  } catch {
    // If Clerk middleware context is missing or misconfigured, treat as unauthenticated
    isAuthenticated = false
  }

  if (!isAuthenticated) {
    redirect("/sign-in")
  }

  return <>{children}</>
}
