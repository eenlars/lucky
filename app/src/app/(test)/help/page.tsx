"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { HelpRequest } from "@/app/api/test/help/route"

export default function HelpPage() {
  const searchParams = useSearchParams()
  const [helpData, setHelpData] = useState<HelpRequest | null>(null)
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(true)
  const [responseMessage, setResponseMessage] = useState("")
  const [error, setError] = useState("")

  const helpId = searchParams.get("id")
  const workflowId = searchParams.get("workflow")

  useEffect(() => {
    if (!helpId) {
      setError("No help ID provided. This page should be accessed from a workflow help link.")
      setLoading(false)
      return
    }

    const fetchHelpRequest = async () => {
      try {
        const res = await fetch(`/api/test/help?id=${helpId}`)
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || "Unknown error")
        }
        const data: HelpRequest = await res.json()
        setHelpData(data)
      } catch (err) {
        setError(`Error fetching help request: ${(err as Error).message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchHelpRequest()
  }, [helpId])

  const handleSubmit = async () => {
    if (!helpId || !answer.trim() || !helpData || helpData.status !== "pending") return

    setLoading(true)
    setError("")
    setResponseMessage("")
    console.log(`[Help Page] Submitting response for helpId: ${helpId}`)

    try {
      const res = await fetch("/api/test/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: helpId, response: answer.trim() }),
      })
      console.log(`[Help Page] API response status: ${res.status}`)

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit")
      }
      setResponseMessage(data.message || "Response submitted successfully")

      // Update helpData with answered status
      const newHelpData = {
        ...helpData,
        status: "answered" as const,
        response: answer.trim(),
      }
      setHelpData(newHelpData)
      setAnswer("")
    } catch (err) {
      console.error(`[Help Page] Error submitting response:`, err)
      setError(`Error: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-red-800">{error}</div>
      </div>
    )
  }

  if (!helpData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-yellow-800">
          No help data available
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-light text-slate-900 tracking-wide">
            {helpData.status === "answered" ? "Help Request Answered" : "Human Help Requested"}
          </h1>
          {workflowId && <p className="text-sm text-slate-600 mt-2">Workflow: {workflowId.slice(0, 8)}...</p>}
        </div>

        {helpData.status === "pending" && (
          <>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600 mb-1">Question:</div>
              <div className="text-slate-900">{helpData.question}</div>
            </div>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={6}
              className="w-full px-4 py-4 text-lg border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none transition-colors duration-200 bg-white placeholder:text-slate-400 resize-y mt-6"
            />

            <button
              onClick={handleSubmit}
              disabled={loading || !helpId || !answer.trim()}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                "Submit Answer"
              )}
            </button>
          </>
        )}

        {helpData.status === "answered" && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600 mb-1">Question:</div>
              <div className="text-slate-900">{helpData.question}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 mb-1">Your Response:</div>
              <div className="text-green-900">{helpData.response}</div>
            </div>
          </div>
        )}

        {responseMessage && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200 text-green-800">
            {responseMessage}
          </div>
        )}
      </div>
    </div>
  )
}
