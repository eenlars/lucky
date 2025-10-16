/**
 * MSW server setup for Node tests
 * Use this to mock external HTTP requests in integration tests
 */
import { setupServer } from "msw/node"
import type { RequestHandler } from "msw"

/**
 * Create an MSW server with the given handlers
 * @example
 * const server = createTestServer(...openaiHandlers())
 * beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
 * afterAll(() => server.close())
 * afterEach(() => server.resetHandlers())
 */
export function createTestServer(...handlers: RequestHandler[]) {
  return setupServer(...handlers)
}
