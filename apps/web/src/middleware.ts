import { auth, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedRoute = createRouteMatcher(["/(.*)"])
export default clerkMiddleware(
  async (_auth, req) => {
    if (isProtectedRoute(req)) await auth.protect()
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
