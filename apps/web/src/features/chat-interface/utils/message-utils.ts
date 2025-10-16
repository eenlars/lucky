/**
 * Message Utility Functions
 *
 * Helper functions for message manipulation, formatting, and validation
 */

import { logException } from "@/lib/error-logger"
import type { UIMessage } from "@ai-sdk-tools/store"

type MessageRole = "user" | "assistant" | "system"

// ============================================================================
// Message Creation
// ============================================================================

export function createMessage(
  content: string,
  role: MessageRole = "user",
  overrides?: Partial<UIMessage>,
): UIMessage {
  return {
    id: generateMessageId(),
    role,
    parts: [{ type: "text", text: content }],
    ...overrides,
  }
}

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// Message Text Extraction
// ============================================================================

/**
 * Extract text content from UIMessage parts
 */
export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter(part => part.type === "text")
    .map(part => (part as any).text)
    .join("")
}

// ============================================================================
// Message Formatting
// ============================================================================

export function formatTimestamp(date: Date, format: "short" | "long" = "short"): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (format === "short") {
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Long format
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function truncateContent(content: string, maxLength = 100): string {
  if (content.length <= maxLength) return content
  return `${content.slice(0, maxLength)}...`
}

// ============================================================================
// Message Validation
// ============================================================================

export function isValidMessage(message: unknown): message is UIMessage {
  if (!message || typeof message !== "object") return false
  const msg = message as Partial<UIMessage>
  return !!(msg.id && msg.role && Array.isArray(msg.parts) && ["user", "assistant", "system"].includes(msg.role))
}

export function validateMessageContent(content: string): {
  isValid: boolean
  error?: string
} {
  if (!content || typeof content !== "string") {
    return { isValid: false, error: "Content must be a non-empty string" }
  }

  const trimmed = content.trim()
  if (trimmed.length === 0) {
    return { isValid: false, error: "Content cannot be empty" }
  }

  if (trimmed.length > 10000) {
    return { isValid: false, error: "Content exceeds maximum length (10000 characters)" }
  }

  return { isValid: true }
}

// ============================================================================
// Message Analysis
// ============================================================================

export function detectCodeBlocks(content: string): boolean {
  return /```[\s\S]*?```/.test(content) || /`[^`]+`/.test(content)
}

export function detectMarkdown(content: string): boolean {
  const markdownPatterns = [
    /^\s*#{1,6}\s+.+/m, // Headers
    /\*\*[^*]+\*\*/, // Bold
    /\*[^*]+\*/, // Italic
    /\[.+\]\(.+\)/, // Links
    /^\s*[-*+]\s+/m, // Lists
    /^\s*\d+\.\s+/m, // Numbered lists
  ]
  return markdownPatterns.some(pattern => pattern.test(content))
}

export function extractCodeLanguage(codeBlock: string): string | null {
  const match = codeBlock.match(/^```(\w+)/)
  return match ? match[1] : null
}

// ============================================================================
// Message Grouping
// ============================================================================

export interface MessageGroup {
  date: string
  messages: UIMessage[]
}

export function groupMessagesByDate(messages: UIMessage[]): MessageGroup[] {
  const groups = new Map<string, UIMessage[]>()

  messages.forEach(message => {
    const metadata = message.metadata as any
    const timestamp = metadata?.timestamp || new Date()
    const dateKey =
      timestamp instanceof Date ? timestamp.toLocaleDateString() : new Date(timestamp).toLocaleDateString()
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(message)
  })

  return Array.from(groups.entries()).map(([date, messages]) => ({
    date,
    messages: messages.sort((a, b) => {
      const aMetadata = a.metadata as any
      const bMetadata = b.metadata as any
      const aTime =
        aMetadata?.timestamp instanceof Date ? aMetadata.timestamp : new Date(aMetadata?.timestamp || 0)
      const bTime =
        bMetadata?.timestamp instanceof Date ? bMetadata.timestamp : new Date(bMetadata?.timestamp || 0)
      return aTime.getTime() - bTime.getTime()
    }),
  }))
}

// ============================================================================
// Message Search
// ============================================================================

export function searchMessages(messages: UIMessage[], query: string): UIMessage[] {
  const lowerQuery = query.toLowerCase()
  return messages.filter(msg => getMessageText(msg).toLowerCase().includes(lowerQuery))
}

// ============================================================================
// Message Diff
// ============================================================================

export function getMessageDiff(
  oldContent: string,
  newContent: string,
): {
  added: string[]
  removed: string[]
  unchanged: string[]
} {
  const oldLines = oldContent.split("\n")
  const newLines = newContent.split("\n")

  const added: string[] = []
  const removed: string[] = []
  const unchanged: string[] = []

  const maxLength = Math.max(oldLines.length, newLines.length)

  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === newLine) {
      unchanged.push(oldLine)
    } else {
      if (oldLine !== undefined) removed.push(oldLine)
      if (newLine !== undefined) added.push(newLine)
    }
  }

  return { added, removed, unchanged }
}

// ============================================================================
// Copy to Clipboard
// ============================================================================

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    // Fallback for older browsers
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-999999px"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      const successful = document.execCommand("copy")
      textArea.remove()
      return successful
    } catch (error) {
      logException(error, {
        location: "/chat-interface/utils/message-utils",
      })
      console.error("Failed to copy:", error)
      textArea.remove()
      return false
    }
  } catch (error) {
    logException(error, {
      location: "/chat-interface/utils/message-utils",
    })
    console.error("Failed to copy to clipboard:", error)
    return false
  }
}
