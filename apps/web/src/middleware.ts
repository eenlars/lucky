import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// API routes that handle their own authentication (support both Clerk and API keys)
const isApiRoute = createRouteMatcher([
  "/api/user/workflows(.*)",
  "/api/workflow/status/(.*)",
  "/api/workflow/cancel/(.*)",
  "/api/v1/invoke(.*)",
])

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"])
export default clerkMiddleware(
  async (auth, req) => {
    // Skip Clerk protection for API routes that handle their own auth
    if (isApiRoute(req)) {
      return NextResponse.next()
    }
    if (!isPublicRoute(req)) await auth.protect()
    // No need to explicitly return NextResponse.next() - clerkMiddleware handles it
  },
  {
    debug: process.env.NODE_ENV === "development" && process.env.CLERK_DEBUG === "1",
    // Enable Clerk's automatic CSP that whitelists required script/frame/img/style sources
    contentSecurityPolicy: {},
  },
)

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Also match the root path explicitly (Next middleware quirk)
    "/",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
