import { clerkMiddleware } from "@clerk/nextjs/server"

export default clerkMiddleware({
  // Enable debug logging in development when CLERK_DEBUG=1
  debug: process.env.NODE_ENV === "development" && process.env.CLERK_DEBUG === "1",
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
