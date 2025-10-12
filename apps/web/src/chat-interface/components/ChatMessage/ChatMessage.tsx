/**
 * ChatMessage Component
 *
 * Main message wrapper that delegates to role-specific renderers
 * The architectural keystone of the message system
 */

"use client"

import type { ChatMessageProps } from "@/chat-interface/types/types"
import { AssistantMessage } from "./AssistantMessage"
import { AssistantMessageEnhanced } from "./AssistantMessageEnhanced"
import { UserMessage } from "./UserMessage"

export function ChatMessage(props: ChatMessageProps) {
  const { message } = props

  // Check if this is a workflow-enhanced assistant message
  const hasWorkflowData = message.role === "assistant" && message.metadata?.workflowData

  // Delegate to role-specific component
  switch (message.role) {
    case "user":
      return <UserMessage {...props} />
    case "assistant":
      // Use enhanced version if message contains workflow data
      if (hasWorkflowData) {
        return <AssistantMessageEnhanced {...props} />
      }
      return <AssistantMessage {...props} />
    case "system":
      // System messages could have their own component
      return <AssistantMessage {...props} />
    default:
      return null
  }
}
