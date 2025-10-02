"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export type ApproveData = {
  text: string
}

export default function ApprovePage() {
  const searchParams = useSearchParams()
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState("")

  const approvalId = searchParams.get("id")
  const workflowId = searchParams.get("workflow")

  useEffect(() => {
    if (!approvalId) {
      setResponse("No approval ID provided. This page should be accessed from a workflow approval link.")
    }
  }, [approvalId])

  const handleSubmit = async (action: "approve" | "reject" = "approve") => {
    if (!approvalId) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        id: approvalId,
        action: action,
        text: text.trim() || (action === "approve" ? "Approved" : "Rejected"),
      })

      const res = await fetch(`/api/test/approve?${params}`)
      const data = (await res.json()) as ApproveData
      setResponse(data.text ?? "no response")
    } catch (error) {
      setResponse(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-light text-slate-900 tracking-wide">Workflow Approval Required</h1>
          {workflowId && <p className="text-sm text-slate-600 mt-2">Workflow: {workflowId.slice(0, 8)}...</p>}
        </div>

        <div className="space-y-6">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Optional: Add a comment..."
            className="w-full px-4 py-4 text-lg border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none transition-colors duration-200 bg-white placeholder:text-slate-400"
          />

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleSubmit("approve")}
              disabled={loading || !approvalId}
              className="flex-1 py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                "Approve"
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("reject")}
              disabled={loading || !approvalId}
              className="flex-1 py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Reject
            </button>
          </div>

          {response && (
            <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600 mb-1">Response:</div>
              <div className="text-slate-900">{response}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
