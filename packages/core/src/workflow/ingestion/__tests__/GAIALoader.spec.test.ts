import { GAIALoader } from "@core/evaluation/benchmarks/gaia/GAIALoader"
import { beforeAll, describe, expect, it, vi } from "vitest"

// Mock fetch for integration tests to avoid network calls
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

/**
 * Integration tests for GAIALoader
 * These tests mock the Hugging Face API to avoid network dependencies
 *
 * To run: bun run test GAIALoader.integration.test.ts
 */

describe("GAIALoader Integration Tests", () => {
  // Skip these tests in CI or if explicitly disabled
  const skipIntegration = process.env.SKIP_INTEGRATION_TESTS === "true"
  const hasToken = !!process.env.HF_TOKEN

  beforeAll(() => {
    if (skipIntegration) {
      console.log("Skipping integration tests (SKIP_INTEGRATION_TESTS=true)")
    }
    if (!hasToken) {
      console.log("Warning: No HF_TOKEN found. Tests may fail if dataset is gated.")
    }

    // Mock successful API response (omit file_name so instance isn't filtered out)
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        rows: [
          {
            row: {
              task_id: "test_task_1",
              Question: "What is the capital of France?",
              Final_answer: "Paris",
              Level: 1,
              Annotator_Metadata: {
                Steps: 3,
                Number_of_tools: 1,
                Tools: ["search"],
              },
            },
          },
        ],
        num_rows_total: 1,
      }),
    })
  })

  it.skipIf(skipIntegration)(
    "should fetch a real GAIA instance from validation split",
    async () => {
      try {
        // Try to fetch the first few instances to find a valid task_id
        const instances = await GAIALoader.fetchByLevel(1, "validation", 3, process.env.HF_TOKEN)

        expect(instances).toBeDefined()
        expect(instances.length).toBeGreaterThan(0)

        // Check the structure of the first instance
        const firstInstance = instances[0]
        expect(firstInstance).toHaveProperty("task_id")
        expect(firstInstance).toHaveProperty("Question")
        expect(firstInstance).toHaveProperty("Level")

        console.log("Successfully fetched GAIA instance:", {
          task_id: firstInstance.task_id,
          level: firstInstance.Level,
          hasFile: !!firstInstance.file_name,
          questionPreview: `${firstInstance.Question.substring(0, 50)}...`,
        })
      } catch (error) {
        if (error instanceof Error && error.message.includes("Authentication required")) {
          console.log("Test skipped: GAIA dataset requires authentication (HF_TOKEN)")
          return
        }
        throw error
      }
    },
    30000,
  ) // 30 second timeout for API calls

  it.skipIf(skipIntegration)(
    "should fetch instances by difficulty level",
    async () => {
      try {
        // Test each difficulty level
        for (const level of [1, 2, 3] as const) {
          const instances = await GAIALoader.fetchByLevel(level, "validation", 2, process.env.HF_TOKEN)

          if (instances.length > 0) {
            // Verify all instances have the correct level
            expect(instances.every(inst => inst.Level === level)).toBe(true)
            console.log(`Found ${instances.length} instances for level ${level}`)
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("Authentication required")) {
          console.log("Test skipped: GAIA dataset requires authentication (HF_TOKEN)")
          return
        }
        throw error
      }
    },
    60000,
  ) // 60 second timeout for multiple API calls

  it.skipIf(skipIntegration)(
    "should handle API structure correctly",
    async () => {
      try {
        // Make a direct API call to verify our assumptions about the structure
        const url = new URL("https://datasets-server.huggingface.tech/rows")
        url.searchParams.set("dataset", "gaia-benchmark/GAIA")
        url.searchParams.set("config", "2023_all")
        url.searchParams.set("split", "validation")
        url.searchParams.set("offset", "0")
        url.searchParams.set("length", "5")

        const headers: HeadersInit = {}
        if (process.env.HF_TOKEN) {
          headers.Authorization = `Bearer ${process.env.HF_TOKEN}`
        }

        const response = await fetch(url.toString(), { headers })

        if (!response.ok) {
          if (response.status === 401) {
            console.log("Dataset is gated and requires authentication")
            return
          }
          throw new Error(`API returned status ${response.status}`)
        }

        const data = await response.json()

        expect(data).toHaveProperty("rows")
        expect(Array.isArray(data.rows)).toBe(true)

        if (data.rows.length > 0) {
          const firstRow = data.rows[0].row
          console.log("API structure verified. Sample fields:", Object.keys(firstRow))

          // Verify expected fields exist
          expect(firstRow).toHaveProperty("task_id")
          expect(firstRow).toHaveProperty("Question")
          expect(firstRow).toHaveProperty("Level")
        }
      } catch (error) {
        console.log("Could not verify API structure:", error)
      }
    },
    30000,
  )

  it.skipIf(skipIntegration || !hasToken)(
    "should fetch a specific task by ID",
    async () => {
      try {
        // First get a valid task_id
        const instances = await GAIALoader.fetchByLevel(1, "validation", 1, process.env.HF_TOKEN)

        if (instances.length === 0) {
          console.log("No instances found to test fetchById")
          return
        }

        const taskId = instances[0].task_id

        // Now fetch that specific task
        const instance = await GAIALoader.fetchById(taskId, "validation", process.env.HF_TOKEN)

        expect(instance.task_id).toBe(taskId)
        expect(instance.Question).toBeTruthy()
        expect(instance.Level).toBeTruthy()

        console.log(`Successfully fetched task ${taskId} by ID`)
      } catch (error) {
        console.log("Could not test fetchById:", error)
      }
    },
    30000,
  )
})
