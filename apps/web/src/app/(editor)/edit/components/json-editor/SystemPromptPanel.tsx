"use client"

import { Button } from "@/components/ui/button"
import { createWorkflowPrompt } from "@lucky/core/prompts/createWorkflow"
import { useState } from "react"

export default function SystemPromptPanel() {
  const [showSystemPrompt, setShowSystemPrompt] = useState(false)

  return (
    <div className="bg-white border-b border-gray-200">
      <Button
        onClick={() => setShowSystemPrompt(!showSystemPrompt)}
        variant="ghost"
        className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-none h-auto font-normal"
      >
        <span className="text-sm font-medium text-gray-700">AI System Prompt</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showSystemPrompt ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {showSystemPrompt && (
        <div className="px-6 pb-4">
          <textarea
            value={createWorkflowPrompt}
            readOnly
            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-md font-mono text-gray-600"
            rows={6}
          />
        </div>
      )}
    </div>
  )
}
