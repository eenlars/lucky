import { defineTool } from "@core/tools/toolFactory"
import { lgg } from "@core/utils/logging/Logger"
import * as fs from "fs/promises"
import { nanoid } from "nanoid"
import * as path from "path"
import { z } from "zod"

const HELP_STORAGE_PATH = path.join(process.cwd(), "logging_folder", "help")

interface HelpRequest {
  id: string
  workflowInvocationId: string
  question: string
  timestamp: number
  status: "pending" | "answered"
  response?: string
}

export type HumanHelpParams = {
  action: "question" | "answer"
  content: string
}

const humanHelp = defineTool({
  name: "humanHelp",
  description: "Ask for human help or provide an answer",
  params: z.object({
    action: z.enum(["question", "answer"]).describe("Action to perform: 'question' to ask, 'answer' to respond."),
    content: z.string().describe("The question or answer content."),
  }),
  async execute(params, context) {
    const { action, content } = params
    const workflowInvocationId = context.workflowInvocationId

    await fs.mkdir(HELP_STORAGE_PATH, { recursive: true })

    if (action === "question") {
      const newHelpId = nanoid()
      const helpRequest: HelpRequest = {
        id: newHelpId,
        workflowInvocationId,
        question: content,
        timestamp: Date.now(),
        status: "pending",
      }

      const requestFilePath = path.join(HELP_STORAGE_PATH, `${newHelpId}.json`)
      await fs.writeFile(requestFilePath, JSON.stringify(helpRequest, null, 2))

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const helpUrl = `${baseUrl}/help?id=${newHelpId}&workflow=${workflowInvocationId}`

      lgg.info("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      lgg.info("🆘 HUMAN HELP REQUESTED")
      lgg.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      lgg.info(`Question: ${content}`)
      lgg.info(`\n👉 Click here to help: ${helpUrl}\n`)
      lgg.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

      const startTime = Date.now()
      const timeoutSeconds = 30
      const timeoutMs = timeoutSeconds * 1000
      const pollIntervalMs = 1000

      while (true) {
        if (Date.now() - startTime > timeoutMs) {
          await fs.unlink(requestFilePath).catch(() => {})
          return {
            success: false,
            error: `Help request timeout after ${timeoutSeconds} seconds`,
          }
        }

        try {
          const requestData = await fs.readFile(requestFilePath, "utf-8")
          const currentRequest: HelpRequest = JSON.parse(requestData)
          console.log(`[humanHelp tool] Polling help request ${newHelpId}: status is ${currentRequest.status}`)

          if (currentRequest.status === "answered") {
            lgg.info(`✅ Help received: ${currentRequest.response || "No response provided"}`)
            return {
              success: true,
              data: {
                response: currentRequest.response || "No response provided",
                helpId: newHelpId,
              },
            }
          }
        } catch (error) {
          console.log(`[humanHelp tool] Polling error for help request ${newHelpId}:`, error)
          // Continue polling
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
      }
    } else if (action === "answer") {
      const files = await fs.readdir(HELP_STORAGE_PATH)
      let pendingFile: string | undefined
      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(HELP_STORAGE_PATH, file)
          const data = await fs.readFile(filePath, "utf-8")
          const req: HelpRequest = JSON.parse(data)
          if (req.workflowInvocationId === workflowInvocationId && req.status === "pending") {
            pendingFile = filePath
            break
          }
        }
      }
      if (!pendingFile) {
        return {
          success: false,
          error: "No pending help request found for this workflow",
        }
      }
      const helpRequest = JSON.parse(await fs.readFile(pendingFile, "utf-8"))
      helpRequest.status = "answered"
      helpRequest.response = content
      await fs.writeFile(pendingFile, JSON.stringify(helpRequest, null, 2))
      return { success: true, data: "Help request answered successfully" }
    } else {
      return { success: false, error: "Invalid action" }
    }
  },
})

export const tool = humanHelp
