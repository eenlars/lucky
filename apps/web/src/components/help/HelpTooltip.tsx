"use client"

import { HelpCircle } from "lucide-react"
import { useState } from "react"

interface HelpTooltipProps {
  content: string
  className?: string
}

export function HelpTooltip({ content, className = "" }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className={`inline-flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${className}`}
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg animate-in fade-in duration-200">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
        </div>
      )}
    </div>
  )
}

// Predefined tooltips for common terms
export const helpContent = {
  fitness: "A score that measures how well a workflow performs. Higher is better. Combines accuracy, speed, and cost.",
  accuracy: "How often the workflow produces the correct output. 1.0 means perfect, 0.0 means always wrong.",
  workflow: "A sequence of AI agents working together to solve a task. Each agent has a specific role.",
  invocation: "A single run of a workflow. Each invocation shows how the workflow performed on one input.",
  evolution: "The process of automatically improving workflows by testing variations and keeping the best ones.",
  node: "One AI agent in your workflow. Each node processes information and passes it to the next.",
  handoff: "When one agent finishes its work and passes control to another agent in the workflow.",
  tools: "Actions an agent can take, like searching the web, reading files, or running code.",
  cost: "How much running the workflow costs. Based on the AI models used and how long they run.",
  generation: "One round of testing workflow variations during evolution. Later generations are usually better.",
}
