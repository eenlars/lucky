/**
 * MessageTimestamp Component
 *
 * Displays message timestamp with smart formatting
 */

"use client"

import { formatTimestamp } from "@/chat-interface/utils/message-utils"
import { cn } from "@/lib/utils"

interface MessageTimestampProps {
  timestamp: Date
  format?: "short" | "long"
  className?: string
}

export function MessageTimestamp({ timestamp, format = "short", className }: MessageTimestampProps) {
  return (
    <time dateTime={timestamp.toISOString()} className={cn("font-light", className)} title={timestamp.toLocaleString()}>
      {formatTimestamp(timestamp, format)}
    </time>
  )
}
