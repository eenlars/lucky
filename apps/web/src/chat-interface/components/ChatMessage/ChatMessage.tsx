/**
 * ChatMessage Component
 *
 * Main message wrapper that delegates to role-specific renderers
 * The architectural keystone of the message system
 */

"use client"

import type { ChatMessageProps } from "../../types"
import { AssistantMessage } from "./AssistantMessage"
import { UserMessage } from "./UserMessage"

export function ChatMessage(props: ChatMessageProps) {
  const { message } = props

  // Delegate to role-specific component
  switch (message.role) {
    case "user":
      return <UserMessage {...props} />
    case "assistant":
      return <AssistantMessage {...props} />
    case "system":
      // System messages could have their own component
      return <AssistantMessage {...props} />
    default:
      return null
  }
}
