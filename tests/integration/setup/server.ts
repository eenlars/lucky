import http from "node:http"
import type { AddressInfo } from "node:net"
/**
 * Global setup for integration tests
 * Starts Next.js dev server on ephemeral port (OS-assigned)
 * No port conflicts, parallel-safe, automatic discovery
 */
import next from "next"
import waitOn from "wait-on"

let httpServer: http.Server | null = null
let nextApp: ReturnType<typeof next> | null = null

export async function setup() {
  console.log("[integration-setup] Starting Next.js dev server...")

  // Resolve absolute path to ensure we're in the right workspace
  const webDir = new URL("../../../apps/web", import.meta.url).pathname
  console.log(`[integration-setup] Next.js dir: ${webDir}`)

  // Dev mode: instant feedback, no build required
  nextApp = next({ dev: true, dir: webDir })
  await nextApp.prepare()

  const handler = nextApp.getRequestHandler()
  httpServer = http.createServer((req, res) => handler(req, res))

  // listen(0) => OS picks a free port automatically
  // No conflicts, works in parallel, CI-friendly
  await new Promise<void>(resolve => httpServer!.listen(0, resolve))
  const port = (httpServer!.address() as AddressInfo).port
  const url = `http://127.0.0.1:${port}`

  console.log(`[integration-setup] Server listening on ${url}`)

  // Share URL with all tests
  process.env.SERVER_URL = url
  // @ts-ignore - globalThis for runtime access
  globalThis.__SERVER_URL__ = url

  // Wait for server to be fully ready before running tests
  // Use middleware which always exists as health check
  console.log("[integration-setup] Waiting for server ready...")
  await waitOn({
    resources: [`${url}/`],
    timeout: 45_000,
    interval: 500,
    validateStatus: (status: number) => status >= 200 && status < 500, // Any response means server is up
  })

  console.log("[integration-setup] ✅ Server ready, running tests...")

  // Return teardown function
  return async () => {
    console.log("[integration-setup] Shutting down server...")

    try {
      // Force close HTTP server with timeout
      if (httpServer) {
        // Stop accepting new connections immediately
        httpServer.closeAllConnections?.()

        await Promise.race([
          new Promise<void>(resolve => httpServer!.close(() => resolve())),
          new Promise<void>(resolve => setTimeout(resolve, 1000)),
        ])
        httpServer = null
      }

      // Close Next.js app (stops file watchers)
      if (nextApp) {
        await Promise.race([nextApp.close(), new Promise<void>(resolve => setTimeout(resolve, 2000))])
        nextApp = null
      }

      console.log("[integration-setup] ✅ Server shutdown complete")
    } catch (error) {
      console.error("[integration-setup] Error during shutdown:", error)
      // Force exit if graceful shutdown fails
      process.exit(0)
    }
  }
}
