import { ApproveData } from "@/app/(test)/approve/page"
import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs/promises"
import * as path from "path"

const APPROVAL_STORAGE_PATH = path.join(
  process.cwd(),
  "logging_folder",
  "approvals"
)

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
    const response =
      searchParams.get("text") || searchParams.get("response") || "Approved"

    console.log("=== Approve Route - Processing Approval ===")
    console.log("Approval ID:", approvalId)
    console.log("Action:", action)
    console.log("Response:", response)

    if (!approvalId) {
      return NextResponse.json<ApproveData>({
        text: "Error: Missing approval ID",
      })
    }

    // read the approval request file
    const requestFilePath = path.join(
      APPROVAL_STORAGE_PATH,
      `${approvalId}.json`
    )

    try {
      const requestData = await fs.readFile(requestFilePath, "utf-8")
      const approvalRequest: ApprovalRequest = JSON.parse(requestData)

      // update the approval status
      approvalRequest.status = action === "reject" ? "rejected" : "approved"
      approvalRequest.response = response

      // save the updated request
      await fs.writeFile(
        requestFilePath,
        JSON.stringify(approvalRequest, null, 2)
      )

      return NextResponse.json<ApproveData>({
        text: `Approval ${approvalRequest.status}: ${response}`,
      })
    } catch (error) {
      console.error("Error reading approval request:", error)
      return NextResponse.json<ApproveData>({
        text: "Error: Approval request not found or expired",
      })
    }
  } catch (error) {
    console.error("Error in approve route:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    )
  }
}
