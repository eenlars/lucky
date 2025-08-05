import { lgg } from "@core/utils/logging/Logger"
import type {
  WebArenaInstance,
  WorkflowIO,
} from "@core/workflow/ingestion/ingestion.types"

export class WebArenaLoader {
  private static readonly DATASET_REPO = "web-arena-x/webarena"
  private static readonly CONFIG_FILE_URL =
    "https://raw.githubusercontent.com/web-arena-x/webarena/main/config_files/test.raw.json"
  private static readonly TIMEOUT_MS = 10000 // 10 second timeout

  static async fetchAsWorkflowIO(
    limit: number = 100,
    sites?: string[]
  ): Promise<WorkflowIO[]> {
    lgg.info(`Fetching ${limit} WebArena tasks as WorkflowIO[]`)

    try {
      const response = await this.fetchWithTimeout(this.CONFIG_FILE_URL)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const rawData = await response.text()

      if (!rawData.trim()) {
        throw new Error("No WebArena tasks found")
      }

      const allTasks = JSON.parse(rawData) as WebArenaInstance[]
      const tasks = allTasks
        .filter(
          (task) => !sites || task.sites.some((site) => sites.includes(site))
        )
        .slice(0, limit)

      if (tasks.length === 0) {
        throw new Error("No WebArena tasks found")
      }

      return tasks.map((task) => {
        // compose the workflow input with the task intent and context
        const workflowInput = `Task: ${task.intent}

Sites involved: ${task.sites.join(", ")}
Requires login: ${task.require_login ? "Yes" : "No"}

Please complete this task by interacting with the specified websites.`

        // the expected output contains the evaluation criteria and reference answers
        let expectedWorkflowOutput = `Evaluation criteria:
- Evaluation types: ${task.eval.eval_types.join(", ")}`

        if (task.eval.reference_answers.exact_match) {
          expectedWorkflowOutput += `
- Expected exact match: "${task.eval.reference_answers.exact_match}"`
        }

        if (
          task.eval.reference_answers.must_include &&
          task.eval.reference_answers.must_include.length > 0
        ) {
          expectedWorkflowOutput += `
- Must include: ${JSON.stringify(task.eval.reference_answers.must_include, null, 2)}`
        }

        if (
          task.eval.reference_answers.fuzzy_match &&
          task.eval.reference_answers.fuzzy_match.length > 0
        ) {
          expectedWorkflowOutput += `
- Fuzzy match options: ${JSON.stringify(task.eval.reference_answers.fuzzy_match, null, 2)}`
        }

        const workflowCase: WorkflowIO = {
          workflowInput,
          expectedWorkflowOutput,
        }

        return workflowCase
      })
    } catch (error) {
      lgg.error("Failed to fetch WebArena as WorkflowIO", error)
      throw new Error(
        `Failed to convert WebArena to WorkflowIO: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  static async fetchById(taskId: number): Promise<WebArenaInstance> {
    lgg.info(`Fetching WebArena task ${taskId}`)

    try {
      const response = await this.fetchWithTimeout(this.CONFIG_FILE_URL)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const rawData = await response.text()

      if (!rawData.trim()) {
        throw new Error(`WebArena task ${taskId} not found`)
      }

      const tasks = JSON.parse(rawData) as WebArenaInstance[]

      const found = tasks.find((task) => task.task_id === taskId)

      if (!found) {
        throw new Error(`WebArena task ${taskId} not found`)
      }

      return found
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error
      }

      lgg.error(`Failed to fetch WebArena task ${taskId}:`, error)

      // check if this is a network connectivity issue
      if (this.isNetworkError(error)) {
        lgg.warn(
          "Network connectivity issue detected, falling back to mock data"
        )
        return this.getMockInstance(taskId)
      }

      throw new Error(`Failed to fetch WebArena task ${taskId}: ${error}`)
    }
  }

  static async fetchBySites(
    sites: string[],
    limit: number = 10
  ): Promise<WebArenaInstance[]> {
    lgg.info(`Fetching WebArena tasks for sites: ${sites.join(", ")}`)

    try {
      const response = await this.fetchWithTimeout(this.CONFIG_FILE_URL)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const rawData = await response.text()

      if (!rawData.trim()) {
        return []
      }

      const allTasks = JSON.parse(rawData) as WebArenaInstance[]
      const tasks = allTasks
        .filter((task) => task.sites.some((site) => sites.includes(site)))
        .slice(0, limit)

      lgg.info(`Fetched ${tasks.length} WebArena tasks for the specified sites`)
      return tasks
    } catch (error) {
      lgg.error(
        `Failed to fetch WebArena tasks for sites ${sites.join(", ")}:`,
        error
      )
      throw new Error(`Failed to fetch WebArena tasks: ${error}`)
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

  private static getMockInstance(taskId: number): WebArenaInstance {
    lgg.info(`Returning mock data for WebArena task ${taskId}`)

    return {
      task_id: taskId,
      sites: ["shopping", "mock_site"],
      intent_template: "Mock template for task {{id}}",
      intent: `Mock task intent for task ${taskId}. This is a placeholder when the actual WebArena dataset is not accessible due to network issues.`,
      require_login: false,
      eval: {
        eval_types: ["string_match"],
        reference_answers: {
          exact_match: `Mock answer for task ${taskId}`,
        },
      },
    }
  }
}
