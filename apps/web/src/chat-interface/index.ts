/**
 * Chat Interface - Main Exports
 *
 * Clean barrel exports for the chat system
 */

// Main component
export { ChatInterface } from "./ChatInterface"

// Types
export type {
  Message,
  MessageRole,
  MessageStatus,
  ChatInterfaceProps,
  ChatMessageProps,
  ChatConfig,
} from "./types"

// Hooks
export { useChat } from "./hooks/useChat"
export { useAutoScroll } from "./hooks/useAutoScroll"
export { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts"

// Utilities (if needed externally)
export {
  createMessage,
  formatTimestamp,
  copyToClipboard,
} from "./utils/message-utils"

// Components (if needed for custom compositions)
export { ChatMessage as ChatMessageComponent } from "./components/ChatMessage/ChatMessage"
export { ChatInput as ChatInputComponent } from "./components/ChatInput/ChatInput"
export { ChatWelcome } from "./components/ChatWelcome/ChatWelcome"
export { ChatSuggestions } from "./components/ChatSuggestions/ChatSuggestions"
export { TypingIndicator } from "./components/TypingIndicator/TypingIndicator"
