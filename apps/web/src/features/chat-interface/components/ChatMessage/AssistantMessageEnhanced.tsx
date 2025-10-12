/**
 * AssistantMessageEnhanced
 *
 * Enhanced assistant message that can show:
 * - Regular text responses
 * - Workflow generation progress
 * - Workflow execution progress
 * - Workflow results with actions
 *
 * This bridges chat UX with workflow power
 */

"use client"

import type { Message } from "@/features/chat-interface/types/types"
import { cn } from "@/lib/utils"
import { Bot } from "lucide-react"
import { WorkflowGenerationCard } from "../WorkflowGeneration/WorkflowGenerationCard"
import { WorkflowResultCard } from "../WorkflowResult/WorkflowResultCard"

interface AssistantMessageEnhancedProps {
  message: Message
  isLast?: boolean
  onShowWorkflow?: (workflowId: string) => void
  onSaveWorkflow?: (workflowId: string) => void
  onRunAgain?: (workflowId: string) => void
  className?: string
}

export function AssistantMessageEnhanced({
  message,
  isLast,
  onShowWorkflow,
  onSaveWorkflow,
  onRunAgain,
  className,
}: AssistantMessageEnhancedProps) {
  // Check if this message contains workflow data
  const workflowData = message.metadata?.workflowData as
    | {
        type: "generation" | "execution" | "result"
        status?: "generating" | "running" | "complete" | "error"
        workflowId?: string
        workflowName?: string
        nodeCount?: number
        currentNode?: string
        progress?: number
        result?: {
          output: string | Record<string, unknown>
          cost?: number
          duration?: number
          nodeCount?: number
        }
      }
    | undefined

  const hasWorkflow = !!workflowData
  const hasTextContent = message.content && message.content.trim().length > 0

  return (
    <div className={cn("flex gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-400", className)}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-sm">
        <Bot className="w-4 h-4 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Text content */}
        {hasTextContent && (
          <div className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap break-words">{message.content}</div>
        )}

        {/* Workflow generation card */}
        {hasWorkflow && (workflowData.type === "generation" || workflowData.type === "execution") && (
          <WorkflowGenerationCard
            status={workflowData.status || "generating"}
            workflowName={workflowData.workflowName}
            nodeCount={workflowData.nodeCount}
            currentNode={workflowData.currentNode}
            progress={workflowData.progress}
          />
        )}

        {/* Workflow result card */}
        {hasWorkflow && workflowData.type === "result" && workflowData.result && (
          <WorkflowResultCard
            result={workflowData.result}
            workflowId={workflowData.workflowId}
            onShowWorkflow={
              workflowData.workflowId && onShowWorkflow ? () => onShowWorkflow(workflowData.workflowId!) : undefined
            }
            onSaveWorkflow={
              workflowData.workflowId && onSaveWorkflow ? () => onSaveWorkflow(workflowData.workflowId!) : undefined
            }
            onRunAgain={workflowData.workflowId && onRunAgain ? () => onRunAgain(workflowData.workflowId!) : undefined}
          />
        )}

        {/* Timestamp (if last message) */}
        {isLast && (
          <div className="text-xs text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  )
}
