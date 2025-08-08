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
