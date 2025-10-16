/**
 * ChatInterface Component
 *
 * Router component that switches between simulation and real AI mode
 */

"use client"

import { ChatInterfaceReal } from "./ChatInterfaceReal"
import { ChatInterfaceSimulation } from "./ChatInterfaceSimulation"
import type { ChatInterfaceProps } from "./types/types"

export function ChatInterface(props: ChatInterfaceProps) {
  const { useSimulation = true, modelName, nodeId } = props

  // Use real AI mode with Provider pattern
  if (!useSimulation && modelName && nodeId) {
    return <ChatInterfaceReal {...props} />
  }

  // Use simulation mode
  return <ChatInterfaceSimulation {...props} />
}
