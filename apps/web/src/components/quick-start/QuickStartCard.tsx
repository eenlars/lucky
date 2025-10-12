"use client"

import { Button } from "@/components/ui/button"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { ArrowRight, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

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

export function QuickStartCard() {
  const router = useRouter()

  const handleLoadDemo = useCallback(() => {
    // Store the demo workflow in sessionStorage to load it in the editor
    sessionStorage.setItem("demo_workflow", JSON.stringify(DEMO_WORKFLOW))
    // Navigate to the editor
    router.push("/edit")
  }, [router])

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Try it in 30 seconds</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Load a demo workflow and see how it works. You can run it yourself when you&apos;re ready.
          </p>

          <Button onClick={handleLoadDemo} className="group">
            Load demo workflow
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  )
}
