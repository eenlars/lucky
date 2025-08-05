import { lgg } from "@core/utils/logging/Logger"
import type {
  SWEBenchInstance,
  WorkflowIO,
} from "@core/workflow/ingestion/ingestion.types"

export class SWEBenchLoader {
  private static readonly DATASET = "princeton-nlp/SWE-bench"
  private static readonly CONFIG = "default"
  private static readonly BASE_URL =
    "https://datasets-server.huggingface.co/rows"
  private static readonly TIMEOUT_MS = 10000 // 10 second timeout

  static async fetchAsWorkflowIO(
    split: "train" | "dev" | "test" = "train",
    limit: number = 100
  ): Promise<WorkflowIO[]> {
    const url = new URL(this.BASE_URL)
    url.searchParams.set("dataset", this.DATASET)
    url.searchParams.set("config", this.CONFIG)
    url.searchParams.set("split", split)
    url.searchParams.set("offset", "0")
    url.searchParams.set("length", limit.toString())

    lgg.info(`Fetching ${limit} SWE-bench questions as WorkflowIO[]`)

    try {
      const response = await this.fetchWithTimeout(url.toString())

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data.rows || data.rows.length === 0) {
        throw new Error("No instances found")
      }

      return data.rows.map((item: any) => {
        const instance = item.row

        // compose the workflow input with ONLY the problem context - no answers or solutions
        let workflowInput = `Repository: ${instance.repo}
Base commit: ${instance.base_commit}

Problem statement:
${instance.problem_statement}

Full issue text:
${instance.text}`

        // Add hints/comments if available (but not solutions)
        if (instance.hints_text) {
          workflowInput += `

Issue hints/comments:
${instance.hints_text}`
        }

        // the expected output contains ALL evaluation materials
        let expectedWorkflowOutput = `Expected patch:
${instance.patch}`

        // Add test patch if available
        if (instance.test_patch) {
          expectedWorkflowOutput += `

Test patch:
${instance.test_patch}`
        }

        // Add test information to the output (evaluation materials)
        if (instance.FAIL_TO_PASS && instance.FAIL_TO_PASS.length > 0) {
          expectedWorkflowOutput += `

Tests that should pass after fix:
${JSON.stringify(instance.FAIL_TO_PASS, null, 2)}`
        }

        if (instance.PASS_TO_PASS && instance.PASS_TO_PASS.length > 0) {
          expectedWorkflowOutput += `

Tests that should continue passing:
${JSON.stringify(instance.PASS_TO_PASS, null, 2)}`
        }

        const workflowCase: WorkflowIO = {
          workflowInput,
          expectedWorkflowOutput,
        }

        return workflowCase
      })
    } catch (error) {
      lgg.error("Failed to fetch SWE-bench as WorkflowIO", error)
      throw new Error(
        `Failed to convert SWE-bench to WorkflowIO: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  static async fetchById(
    id: string,
    split: "train" | "dev" | "test" = "test"
  ): Promise<SWEBenchInstance> {
    const url = new URL(this.BASE_URL)
    url.searchParams.set("dataset", this.DATASET)
    url.searchParams.set("config", this.CONFIG)
    url.searchParams.set("split", split)
    url.searchParams.set("offset", "0")
    url.searchParams.set("length", "100") // fetch in batches

    lgg.info(`Fetching SWE-bench instance ${id} from split ${split}`)

    try {
      // we'll need to paginate through results to find the specific instance
      let offset = 0
      const batchSize = 100

      while (true) {
        url.searchParams.set("offset", offset.toString())
        url.searchParams.set("length", batchSize.toString())

        const response = await this.fetchWithTimeout(url.toString())

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // check if we have rows
        if (!data.rows || data.rows.length === 0) {
          break
        }

        // search for our instance_id in this batch
        const found = data.rows.find((item: any) => item.row.instance_id === id)

        if (found) {
          const row = found.row
          return {
            instance_id: row.instance_id,
            problem_statement: row.problem_statement,
            text: row.text,
            repo: row.repo,
            base_commit: row.base_commit,
            patch: row.patch,
            test_patch: row.test_patch || null,
          }
        }

        // if we've fetched all rows, break
        if (data.rows.length < batchSize) {
          break
        }

        offset += batchSize
      }

      throw new Error(`SWE-bench instance ${id} not found in split ${split}`)
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error
      }

      lgg.error(`Failed to fetch SWE-bench instance ${id}:`, error)

      // check if this is a network connectivity issue
      if (this.isNetworkError(error)) {
        lgg.warn(
          "Network connectivity issue detected, falling back to mock data"
        )
        return this.getMockInstance(id)
      }

      throw new Error(`Failed to fetch SWE-bench instance ${id}: ${error}`)
    }
  }

  private static async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: "force-cache",
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private static isNetworkError(error: any): boolean {
    if (!error) return false

    const errorMessage = error.message || error.toString()
    const errorCode = error.code || ""

    return (
      errorMessage.includes("Unable to connect") ||
      errorMessage.includes("Could not resolve host") ||
      errorMessage.includes("ConnectionRefused") ||
      errorMessage.includes("FailedToOpenSocket") ||
      errorMessage.includes("Was there a typo in the url") ||
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("HTTP error! status: 429") ||
      errorMessage.includes("HTTP error! status: 503") ||
      errorCode === "ConnectionRefused" ||
      errorCode === "FailedToOpenSocket"
    )
  }

  private static getMockInstance(id: string): SWEBenchInstance {
    lgg.info(`Returning mock data for SWE-bench instance ${id}`)

    return {
      instance_id: id,
      problem_statement: `Mock problem statement for ${id}. This is a placeholder when the actual SWE-bench dataset is not accessible due to network issues.`,
      text: `Mock text content for ${id}`,
      repo: `mock-repo/${id.split("__")[0] || "unknown"}`,
      base_commit: "mock-commit-hash-12345",
      patch: `diff --git a/mock_file.py b/mock_file.py\nindex 1234567..abcdefg 100644\n--- a/mock_file.py\n+++ b/mock_file.py\n@@ -1,3 +1,4 @@\n # Mock patch for ${id}\n+# This is a mock change\n def mock_function():\n     pass`,
      test_patch: `diff --git a/test_mock.py b/test_mock.py\nindex 1234567..abcdefg 100644\n--- a/test_mock.py\n+++ b/test_mock.py\n@@ -1,3 +1,4 @@\n # Mock test patch for ${id}\n+# This is a mock test change\n def test_mock():\n     assert True`,
    }
  }
}
