import vm from "node:vm"
import { Tools } from "@lucky/shared"
import { defineTool } from "@lucky/tools"
import { z } from "zod"

/**
 * Executes JavaScript code in a sandboxed VM context
 * @param code - JavaScript code to execute
 * @param timeoutMs - Maximum execution time in milliseconds (default: 1000)
 * @returns Result of the last expression or throws error
 */
export function executeJavaScript(code: string, timeoutMs = 1000): unknown {
  // Try to treat as expression first
  try {
    const expressionCode = `(() => { return (${code}) })()`
    return vm.runInNewContext(expressionCode, {}, { timeout: timeoutMs })
  } catch {
    // If that fails, treat as statement block
    const statementCode = `(() => { ${code} })()`
    return vm.runInNewContext(statementCode, {}, { timeout: timeoutMs })
  }
}

/**
 * Sandboxed JavaScript executor tool
 * Executes provided JavaScript code inside a Node.js VM context with no access
 * to Node built-ins such as require, process, or the filesystem. The execution
 * is time-limited and returns whatever value the last expression evaluates to.
 */
const jsExecutor = defineTool({
  name: "jsExecutor",
  description:
    "Execute JavaScript code in a sandboxed environment. Provide JavaScript code and optional timeoutMs (ms). No access to Node APIs, filesystem, or network. Execution limited to 1 second by default.",
  params: z.object({
    code: z
      .string()
      .describe(
        "Raw JavaScript code to execute. The result of the last expression will be returned. Do NOT include asynchronous operations or long-running loops. no need to wrap.",
      ),
    timeoutMs: z.number().optional().describe("Maximum execution time in milliseconds (defaults to 1000ms)."),
  }),
  async execute(params) {
    const { code, timeoutMs = 1000 } = params

    try {
      const result = executeJavaScript(code, timeoutMs)
      return Tools.createSuccess("jsExecutor", result)
    } catch (error) {
      return Tools.createFailure("jsExecutor", {
        location: "jsExecutor:execution",
        error,
      })
    }
  },
})

export const tool = jsExecutor
