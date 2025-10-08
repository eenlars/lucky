"use client"

import { Button } from "@/components/ui/button"
import { trackEvent, trackTiming } from "@/lib/analytics"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

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
const STORAGE_KEY = "lucky_demo_completed"

type DemoState = "loading" | "success" | "error" | "completed"

interface AutoDemoCardProps {
  /**
   * If true, automatically run demo on mount
   * If false, require user to click "Run demo"
   */
  autoRun?: boolean
}

export function AutoDemoCard({ autoRun = false }: AutoDemoCardProps) {
  const [state, setState] = useState<DemoState>("loading")
  const [result, setResult] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const startTimeRef = useRef<number>(0)

  const runDemo = async () => {
    setState("loading")
    setErrorMessage(null)
    setResult(null)

    startTimeRef.current = Date.now()

    // Track demo start
    trackEvent(autoRun ? "demo_auto_started" : "demo_manual_started")

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

      const demoResult = data.data?.finalResponse || "Demo completed successfully!"
      setResult(demoResult)
      setState("success")

      // Track success and timing
      const duration = Date.now() - startTimeRef.current
      trackEvent(autoRun ? "demo_auto_success" : "demo_manual_success")
      trackTiming("time_to_first_success", duration, { auto_run: autoRun })

      // Mark as completed
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, "true")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again."
      setErrorMessage(message)
      setState("error")

      // Track error
      trackEvent(autoRun ? "demo_auto_error" : "demo_manual_error", {
        error_message: message,
      })

      console.error("Error running demo:", err)
    }
  }

  useEffect(() => {
    if (autoRun && typeof window !== "undefined") {
      // Check if already completed
      const hasCompleted = localStorage.getItem(STORAGE_KEY)
      if (!hasCompleted) {
        runDemo()
      } else {
        setState("completed")
      }
    } else {
      setState("completed")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun])

  // Loading state
  if (state === "loading") {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-8 border border-blue-200 dark:border-blue-800">
        <div className="flex flex-col items-center text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Running your first workflow...
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Asking: &ldquo;{DEMO_QUESTION}&rdquo;</p>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (state === "success" && result) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-3 mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-medium text-green-900 dark:text-green-100 mb-1">
              Your first workflow ran successfully!
            </h3>
            <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">{result}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-green-200 dark:border-green-800">
          <Link href="/edit" onClick={() => trackEvent("create_workflow_clicked")}>
            <Button className="w-full group">
              Create your own workflow
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Error state (likely missing API key)
  if (state === "error") {
    const isApiKeyError = errorMessage?.toLowerCase().includes("api key") || errorMessage?.toLowerCase().includes("key")

    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg p-6 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-medium text-amber-900 dark:text-amber-100 mb-1">Almost there!</h3>
            <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
              {isApiKeyError
                ? "Add an API key to run workflows and see them in action."
                : errorMessage || "Something went wrong. Try setting up your API key first."}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/settings" className="flex-1" onClick={() => trackEvent("api_key_setup_clicked")}>
            <Button className="w-full">Set up API key</Button>
          </Link>
          <Link href="/edit" className="flex-1">
            <Button variant="outline" className="w-full">
              Explore anyway
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Default/completed state (shouldn't normally show for auto-run)
  return null
}
