"use client"

import type { AgentStep, AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import { AlertCircle, BookOpen, Brain, Target, Terminal, Type, Wrench } from "lucide-react"

export const getReactJsonTheme = () => {
  if (typeof window !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "monokai"
  }
  return "rjv-default"
}

export const getStepIcon = (type: string) => {
  switch (type) {
    case "reasoning":
      return <Brain className="w-4 h-4" />
    case "plan":
      return <Target className="w-4 h-4" />
    case "learning":
      return <BookOpen className="w-4 h-4" />
    case "terminate":
      return <Terminal className="w-4 h-4" />
    case "text":
      return <Type className="w-4 h-4" />
    case "error":
      return <AlertCircle className="w-4 h-4" />
    case "tool":
      return <Wrench className="w-4 h-4" />
    default:
      return <AlertCircle className="w-4 h-4" />
  }
}

export const getStepTheme = (type: string, isError?: boolean) => {
  if (isError) {
    return {
      cardClass:
        "bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 transition-colors",
      iconClass: "text-red-500 dark:text-red-400",
      labelClass: "text-red-700 dark:text-red-300 text-xs font-medium",
      contentClass: "text-gray-800 dark:text-gray-200",
    }
  }

  return {
    cardClass:
      "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors",
    iconClass: "text-gray-500 dark:text-gray-400",
    labelClass: "text-gray-700 dark:text-gray-300 text-xs font-medium",
    contentClass: "text-gray-800 dark:text-gray-200",
  }
}

export const formatArgsSummary = (args: any): string => {
  if (!args || typeof args !== "object") return String(args || "{}")
  const keys = Object.keys(args)
  if (keys.length === 0) return "{}"
  if (keys.length === 1) {
    const key = keys[0]
    const value = (args as any)[key]
    if (typeof value === "string" && value.length < 30) {
      return `${key}: "${value}"`
    }
    return `${key}: ${typeof value}`
  }
  return `{${keys.length} keys: ${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "..." : ""}}`
}

export const getResultSummary = (toolResponse: any): any => {
  if (!toolResponse || typeof toolResponse !== "object") return toolResponse
  if ((toolResponse as any).result !== undefined) {
    return (toolResponse as any).result
  }
  return toolResponse
}

export const filterRelevantSteps = (steps?: AgentSteps): AgentSteps => {
  if (!steps) return []
  return steps.filter((output: AgentStep) => {
    if (output.type === "learning" || output.type === "reasoning" || output.type === "text") {
      return (output as any).return && String((output as any).return).trim().length > 0
    }
    if (output.type === "terminate") {
      return (output as any).return && String((output as any).return).trim().length > 0
    }
    if (output.type === "tool") {
      return (output as any).name && String((output as any).name).trim().length > 0
    }
    return true
  })
}

// Generate a resilient React key for a step item
export const generateStepKey = (prefix: string, index: number, step: AgentStep): string => {
  const base = `${prefix}-${step.type}-${index}`
  if (step.type === "tool") {
    const name = (step as any).name || ""
    return `${base}-${name}`
  }
  if ((step as any).return) {
    try {
      const str = typeof (step as any).return === "string" ? (step as any).return : JSON.stringify((step as any).return)
      const snippet = str.slice(0, 24).replace(/\s+/g, "_")
      return `${base}-${snippet}`
    } catch {
      return base
    }
  }
  return base
}
