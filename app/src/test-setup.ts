// vitest setup file
import { beforeEach, vi } from "vitest"

// Make vi globally available
declare global {
  var vi: typeof import("vitest").vi
}
global.vi = vi

// ensure clean state between tests
beforeEach(() => {
  // clear all mocks between tests
  vi.clearAllMocks()
})

// Mock ELK to avoid Web Worker usage in Node test environment
vi.mock("elkjs/lib/elk.bundled.js", () => {
  class ELKMock {
    async layout(_graph: any) {
      return { children: [] }
    }
  }
  return { default: ELKMock, ElkNode: class {}, ElkPort: class {} }
})
