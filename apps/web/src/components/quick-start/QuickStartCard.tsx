"use client"

import { Button } from "@/components/ui/button"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const DEMO_WORKFLOW: WorkflowConfig = {
  nodes: [
    {
      nodeId: "demo-agent",
      description: "A helpful AI assistant that answers questions",
      systemPrompt:
        "You are a helpful, friendly AI assistant. Answer questions clearly and concisely in 2-3 sentences.",
      modelName: "anthropic/claude-3-5-haiku",
      mcpTools: [],
      codeTools: [],
      handOffs: [],
    },
  ],
  entryNodeId: "demo-agent",
  memory: {
    purpose: "Quick start demo - answer simple questions",
  },
}

const DEMO_QUESTION = "What are three benefits of using AI workflows?"

export function QuickStartCard() {
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const handleQuickStart = async () => {
    setIsRunning(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/workflow/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dslConfig: DEMO_WORKFLOW,
          evalInput: {
            workflowId: "quick-start-demo",
            type: "text",
            question: DEMO_QUESTION,
            answer: "",
            goal: "Demonstrate AI workflow in action",
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Network error" }))
        throw new Error(errorData.error || "Failed to run demo")
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Demo failed to complete")
      }

      setResult(data.data?.finalResponse || "Demo completed successfully!")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again."
      setError(errorMessage)
      console.error("Error running demo:", err)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Try it in 30 seconds</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            See an AI workflow in action. We&apos;ll ask it: &ldquo;{DEMO_QUESTION}&rdquo;
          </p>

          {result && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 dark:text-green-100 text-sm mb-1">Workflow completed!</p>
                  <p className="text-sm text-green-800 dark:text-green-200">{result}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                <Link
                  href="/edit"
                  className="text-sm text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 font-medium inline-flex items-center gap-1"
                >
                  Create your own workflow
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
              <p className="font-medium mb-1">Couldn&apos;t run demo</p>
              <p className="text-xs">{error}</p>
            </div>
          )}

          {!result && (
            <Button onClick={handleQuickStart} disabled={isRunning} className="group">
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Running demo...
                </>
              ) : (
                <>
                  Run demo now
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
