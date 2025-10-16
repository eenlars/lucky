/**
 * ChatInterface Component
 *
 * Router component that switches between simulation and real AI mode
 */

"use client"

import { ChatInterfaceReal } from "./ChatInterfaceReal"
import { ChatInterfaceSimulation, type ChatInterfaceProps } from "./ChatInterfaceSimulation"

export function ChatInterface(props: ChatInterfaceProps) {
  const { useSimulation = true } = props

  // Use real AI mode with Provider pattern (defaults are in ChatInterfaceReal)
  if (!useSimulation) {
    return <ChatInterfaceReal {...props} />
  }

  // Use simulation mode
  return <ChatInterfaceSimulation {...props} />
}
