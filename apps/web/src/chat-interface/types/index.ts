/**
 * Chat Interface Type Definitions
 *
 * Core types for the chat system, designed for extensibility and type safety
 */

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = "user" | "assistant" | "system"

export type MessageStatus = "sending" | "sent" | "error" | "streaming"

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  status?: MessageStatus
  metadata?: MessageMetadata
}

export interface MessageMetadata {
  /** Model used to generate this message */
  model?: string
  /** Token count for this message */
  tokens?: number
  /** Cost in USD for this message */
  cost?: number
  /** Source references or citations */
  sources?: Source[]
  /** Parent message ID for threading */
  parentId?: string
  /** Whether this message contains code */
  hasCode?: boolean
  /** Whether this message contains markdown */
  hasMarkdown?: boolean
  /** Workflow data for workflow-enabled messages */
  workflowData?: WorkflowMessageData
}

export interface Source {
  id: string
  title: string
  url?: string
  excerpt?: string
}

export interface WorkflowMessageData {
  /** Type of workflow message */
  type: "generation" | "execution" | "result"
  /** Current status */
  status?: "generating" | "running" | "complete" | "error"
  /** Workflow ID */
  workflowId?: string
  /** Workflow name */
  workflowName?: string
  /** Number of nodes in workflow */
  nodeCount?: number
  /** Current node being executed */
  currentNode?: string
  /** Execution progress (0-100) */
  progress?: number
  /** Result data */
  result?: {
    output: string | Record<string, unknown>
    cost?: number
    duration?: number
    nodeCount?: number
  }
}

// ============================================================================
// Streaming Types
// ============================================================================

export interface StreamingMessage extends Omit<Message, "content"> {
  content: string // Partial content being streamed
  isComplete: boolean
}

export type StreamUpdate = {
  type: "token" | "complete" | "error"
  content?: string
  error?: string
}

// ============================================================================
// Chat State Types
// ============================================================================

export interface ChatState {
  messages: Message[]
  isTyping: boolean
  streamingMessage: StreamingMessage | null
  error: Error | null
}

export interface ChatActions {
  sendMessage: (content: string) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
  deleteMessage: (messageId: string) => void
  clearMessages: () => void
  editMessage: (messageId: string, newContent: string) => void
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface ChatInterfaceProps {
  /** Initial messages to display */
  initialMessages?: Message[]
  /** Placeholder text for input */
  placeholder?: string
  /** Callback when user sends a message */
  onSendMessage?: (content: string) => void | Promise<void>
  /** Callback when message is sent successfully */
  onMessageSent?: (message: Message) => void
  /** Callback when error occurs */
  onError?: (error: Error) => void
  /** Custom suggested prompts */
  suggestions?: string[]
  /** Whether to show timestamps */
  showTimestamps?: boolean
  /** Whether to enable message actions (copy, retry, etc) */
  enableMessageActions?: boolean
  /** Whether to enable markdown rendering */
  enableMarkdown?: boolean
  /** Whether to enable code syntax highlighting */
  enableCodeHighlighting?: boolean
  /** Maximum height of the chat container */
  maxHeight?: string
  /** Custom className for container */
  className?: string
}

export interface ChatMessageProps {
  message: Message
  isLast?: boolean
  showActions?: boolean
  showTimestamp?: boolean
  enableMarkdown?: boolean
  enableCodeHighlighting?: boolean
  onRetry?: () => void
  onCopy?: () => void
  onDelete?: () => void
  onFeedback?: (feedback: "positive" | "negative") => void
}

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  maxLength?: number
  className?: string
}

export interface ChatSuggestionsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  className?: string
}

export interface ChatWelcomeProps {
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  className?: string
}

// ============================================================================
// Event Types
// ============================================================================

export type ChatEvent =
  | { type: "message:send"; content: string }
  | { type: "message:receive"; message: Message }
  | { type: "message:retry"; messageId: string }
  | { type: "message:delete"; messageId: string }
  | { type: "message:edit"; messageId: string; content: string }
  | { type: "message:copy"; messageId: string }
  | { type: "message:feedback"; messageId: string; feedback: "positive" | "negative" }
  | { type: "stream:start" }
  | { type: "stream:update"; content: string }
  | { type: "stream:complete"; message: Message }
  | { type: "stream:error"; error: string }
  | { type: "typing:start" }
  | { type: "typing:stop" }
  | { type: "error"; error: Error }

// ============================================================================
// Configuration Types
// ============================================================================

export interface ChatConfig {
  /** Enable streaming responses */
  enableStreaming?: boolean
  /** Enable message persistence */
  enablePersistence?: boolean
  /** Maximum number of messages to keep in memory */
  maxMessages?: number
  /** Auto-scroll to new messages */
  autoScroll?: boolean
  /** Show typing indicator */
  showTypingIndicator?: boolean
  /** Animation duration in ms */
  animationDuration?: number
  /** Debounce delay for input in ms */
  inputDebounceMs?: number
}

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  enableStreaming: false,
  enablePersistence: false,
  maxMessages: 1000,
  autoScroll: true,
  showTypingIndicator: true,
  animationDuration: 300,
  inputDebounceMs: 150,
}
