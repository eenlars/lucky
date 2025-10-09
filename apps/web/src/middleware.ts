import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export default clerkMiddleware(
  async (auth, req) => {
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
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
