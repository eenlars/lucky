import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export default clerkMiddleware(
  async (_auth, req) => {
    // Hide internal/test pages in production
    if (process.env.NODE_ENV === "production") {
      const pathname = req.nextUrl.pathname

      // Block test and experiment pages (unless we add admin check later)
      if (
        pathname.startsWith("/test-graph") ||
        pathname.startsWith("/test-evolution-graph") ||
        pathname.startsWith("/experiments")
      ) {
        return NextResponse.redirect(new URL("/", req.url))
      }
    }
  },
  {
    debug: process.env.NODE_ENV === "development" && process.env.CLERK_DEBUG === "1",
  },
)

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with `_next` or containing a file extension.
    "/((?!.*\\..*|_next).*)",
    // Also match the root path explicitly (Next middleware quirk)
    "/",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
