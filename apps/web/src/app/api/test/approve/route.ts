import * as fs from "node:fs/promises"
import * as path from "node:path"
import { PATHS } from "@lucky/examples/settings/constants"
import { alrighty } from "@/lib/api/server"
import { type NextRequest } from "next/server"

// Use shared runtime path so writers and readers agree
const APPROVAL_STORAGE_PATH = path.join(PATHS.node.logging, "approvals")

interface ApprovalRequest {
  id: string
  workflowInvocationId: string
  message: string
  options?: string[]
  timestamp: number
  status: "pending" | "approved" | "rejected"
  response?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const approvalId = searchParams.get("id")
    const action = searchParams.get("action") || "approve"
    const response = searchParams.get("text") || searchParams.get("response") || "Approved"

    console.log("=== Approve Route - Processing Approval ===")
    console.log("Approval ID:", approvalId)
    console.log("Action:", action)
    console.log("Response:", response)

    if (!approvalId) {
      return alrighty("test/approve", {
        text: "Error: Missing approval ID",
      })
    }

    // Sanitize approvalId to prevent path traversal attacks
    const sanitizedApprovalId = path.basename(approvalId).replace(/[^a-zA-Z0-9_-]/g, "")
    if (!sanitizedApprovalId || sanitizedApprovalId !== approvalId) {
      return alrighty("test/approve", {
        text: "Error: Invalid approval ID format",
      })
    }

    // Determine the request file path (supports legacy locations)
    const candidateDirs = [
      APPROVAL_STORAGE_PATH,
      // legacy: root/logging_folder/approvals
      path.join(PATHS.root, "logging_folder", "approvals"),
      // legacy: CWD/logging_folder/approvals
      path.join(process.cwd(), "logging_folder", "approvals"),
    ]
    const candidateFiles = candidateDirs.map(dir => path.join(dir, `${sanitizedApprovalId}.json`))

    try {
      // Find the first existing candidate file
      let requestFilePath: string | null = null
      for (const filePath of candidateFiles) {
        try {
          await fs.access(filePath)
          requestFilePath = filePath
          break
        } catch {}
      }

      if (!requestFilePath) {
        throw new Error("Approval request file not found in any location")
      }

      const requestData = await fs.readFile(requestFilePath, "utf-8")
      const approvalRequest: ApprovalRequest = JSON.parse(requestData)

      // update the approval status
      approvalRequest.status = action === "reject" ? "rejected" : "approved"
      approvalRequest.response = response

      // save the updated request
      await fs.writeFile(requestFilePath, JSON.stringify(approvalRequest, null, 2))

      return alrighty("test/approve", {
        text: `Approval ${approvalRequest.status}: ${response}`,
      })
    } catch (error) {
      console.error("Error reading approval request:", error)
      return alrighty("test/approve", {
        text: "Error: Approval request not found or expired",
      })
    }
  } catch (error) {
    console.error("Error in approve route:", error)
    return alrighty("test/approve", {
      text: "Error: Failed to process request",
    })
  }
}
