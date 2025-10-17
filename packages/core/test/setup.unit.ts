/**
 * Core unit-tests setup: mock AI SDK to prevent real API calls
 *
 * Mocks at the Vercel AI SDK level (generateText, generateObject, streamText)
 * to ensure no real HTTP requests reach AI providers during unit tests.
 *
 * This throws an error if called, forcing tests to explicitly mock
 * these functions when testing code paths that use them.
 */
import { vi } from "vitest"

vi.mock("ai", async () => {
  const actual = await vi.importActual("ai")
  return {
    ...actual,
    generateText: vi.fn(() => {
      throw new Error(
        "generateText called in unit test. Mock this function explicitly in your test or use a .spec.test integration test.",
      )
    }),
    generateObject: vi.fn(() => {
      throw new Error(
        "generateObject called in unit test. Mock this function explicitly in your test or use a .spec.test integration test.",
      )
    }),
    streamText: vi.fn(() => {
      throw new Error(
        "streamText called in unit test. Mock this function explicitly in your test or use a .spec.test integration test.",
      )
    }),
  }
})
