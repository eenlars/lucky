import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

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
      return
    }
    if (!isPublicRoute(req)) await auth.protect()
  },
  {
    debug: process.env.NODE_ENV === "development" && process.env.CLERK_DEBUG === "1",
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
