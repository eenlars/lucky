import { NextResponse } from "next/server"

/**
 * Simple health/ping check endpoint for integration tests
 * Returns 200 OK when server is ready to accept requests
 */
export function GET() {
  return NextResponse.json({ ok: true })
}

// Handle HEAD requests (wait-on uses HEAD)
export function HEAD() {
  return new NextResponse(null, { status: 200 })
}
