import * as fs from "node:fs/promises"
import * as path from "node:path"
import { lgg } from "@core/utils/logging/Logger"
import { defineTool } from "@lucky/tools"
import { PATHS } from "@lucky/tools/config/runtime"
import { nanoid } from "nanoid"
import { z } from "zod"

// Centralize path with runtime constants to avoid CWD mismatches
const APPROVAL_STORAGE_PATH = path.join(PATHS.node.logging, "approvals")

export interface ApprovalRequest {
  id: string
  workflowInvocationId: string
  message: string
  options?: string[]
  timestamp: number
  status: "pending" | "approved" | "rejected"
  response?: string
}

const humanApproval = defineTool({
  name: "humanApproval",
  description:
    "Request human approval during workflow execution. Displays message in terminal with clickable link, blocks until approval/rejection received. Supports custom messages, optional choices, and configurable timeout. LIMITS: requires manual intervention, blocks workflow execution, timeout default 5 minutes.",
  params: z.object({
    message: z.string().describe("The message to display to the human for approval"),
    options: z.array(z.string()).optional().describe("Optional list of choices for the human to select from"),
    timeoutSeconds: z.number().optional().default(300).describe("Timeout in seconds (default: 5 minutes)"),
  }),
  async execute(params, context) {
    const approvalId = nanoid()
    const workflowInvocationId = context.workflowInvocationId

    // ensure approval storage directory exists
    await fs.mkdir(APPROVAL_STORAGE_PATH, { recursive: true })

    // create approval request
    const approvalRequest: ApprovalRequest = {
      id: approvalId,
      workflowInvocationId,
      message: params.message,
      options: params.options,
      timestamp: Date.now(),
      status: "pending",
    }

    // save approval request to file
    const requestFilePath = path.join(APPROVAL_STORAGE_PATH, `${approvalId}.json`)
    await fs.writeFile(requestFilePath, JSON.stringify(approvalRequest, null, 2))

    // construct approval URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const approvalUrl = `${baseUrl}/approve?id=${approvalId}&workflow=${workflowInvocationId}`

    // log the approval link
    lgg.info("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    lgg.info("🔔 HUMAN APPROVAL REQUIRED")
    lgg.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    lgg.info(`Message: ${params.message}`)
    if (params.options) {
      lgg.info(`Options: ${params.options.join(", ")}`)
    }
    lgg.info(`\n👉 Click here to approve: ${approvalUrl}\n`)
    lgg.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    // poll for approval
    const startTime = Date.now()
    const timeoutMs = params.timeoutSeconds * 1000
    const pollIntervalMs = 1000 // poll every second

    while (true) {
      // check timeout
      if (Date.now() - startTime > timeoutMs) {
        // cleanup request file
        await fs.unlink(requestFilePath).catch(() => {})

        return {
          success: false,
          error: `Approval timeout after ${params.timeoutSeconds} seconds`,
          data: null,
        }
      }

      // check for approval response
      try {
        const requestData = await fs.readFile(requestFilePath, "utf-8")
        const currentRequest: ApprovalRequest = JSON.parse(requestData)

        if (currentRequest.status !== "pending") {
          // cleanup request file
          await fs.unlink(requestFilePath).catch(() => {})

          if (currentRequest.status === "approved") {
            lgg.info(`✅ Approval received: ${currentRequest.response || "Approved"}`)
            return {
              success: true,
              data: {
                approved: true,
                response: currentRequest.response || "Approved",
                approvalId,
              },
              error: null,
            }
          }
          lgg.info(`❌ Approval rejected: ${currentRequest.response || "Rejected"}`)
          return {
            success: true,
            data: {
              approved: false,
              response: currentRequest.response || "Rejected",
              approvalId,
            },
            error: null,
          }
        }
      } catch (_error) {
        // file might have been deleted or corrupted, continue polling
      }

      // wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }
  },
})

export const tool = humanApproval
