# Chat Interface System

> "Originality is returning to the origin" - Antoni Gaudí

A beautifully architected chat interface inspired by Gaudí's organic design principles. Every component serves a purpose, flows naturally, and works in harmony with the whole.

## 🏛️ Architecture Overview

```
chat/
├── ChatInterface.tsx          # Main orchestrator component
├── ARCHITECTURE.md            # Detailed architectural documentation
├── types/                     # TypeScript type definitions
├── utils/                     # Utility functions
│   ├── message-utils.ts      # Message manipulation and formatting
│   └── animation-utils.ts    # Animation helpers and constants
├── hooks/                     # Custom React hooks
│   ├── useChat.ts           # Chat state management
│   ├── useAutoScroll.ts     # Scroll behavior
│   └── useKeyboardShortcuts.ts  # Keyboard navigation
└── components/               # UI components
    ├── ChatMessage/         # Message display system
    ├── ChatInput/           # User input system
    ├── ChatWelcome/         # Welcome screen
    ├── ChatSuggestions/     # Suggested prompts
    └── TypingIndicator/     # Activity indicator
```

## 🚀 Quick Start

### Basic Usage

```tsx
import { ChatInterface } from '@/components/chat'

function MyApp() {
  return (
    <ChatInterface
      placeholder="Ask me anything..."
      onSendMessage={(message) => {
        console.log('User sent:', message)
      }}
    />
  )
}
```

### Advanced Usage

```tsx
import { ChatInterface } from '@/components/chat'
import type { Message } from '@/components/chat'

function AdvancedChat() {
  const handleSend = async (message: string) => {
    // Send to your backend
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    })
    // Handle response...
  }

  return (
    <ChatInterface
      placeholder="Ask me anything..."
      onSendMessage={handleSend}
      suggestions={[
        "How do I create a workflow?",
        "Show me examples",
        "Explain workflow optimization"
      ]}
      enableMessageActions={true}
      showTimestamps={true}
      enableMarkdown={true}
    />
  )
}
```

## 🎨 Component API

### ChatInterface Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialMessages` | `Message[]` | `[]` | Initial messages to display |
| `placeholder` | `string` | `"Ask me anything about workflows..."` | Input placeholder text |
| `onSendMessage` | `(content: string) => void \| Promise<void>` | - | Callback when user sends message |
| `onMessageSent` | `(message: Message) => void` | - | Callback after message is sent |
| `onError` | `(error: Error) => void` | - | Error callback |
| `suggestions` | `string[]` | Default suggestions | Suggested prompts |
| `showTimestamps` | `boolean` | `true` | Show message timestamps |
| `enableMessageActions` | `boolean` | `true` | Enable copy/retry/delete actions |
| `enableMarkdown` | `boolean` | `false` | Enable markdown rendering |
| `enableCodeHighlighting` | `boolean` | `false` | Enable code syntax highlighting |
| `maxHeight` | `string` | - | Maximum height of container |
| `className` | `string` | - | Additional CSS classes |

### Message Type

```typescript
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  status?: 'sending' | 'sent' | 'error' | 'streaming'
  metadata?: MessageMetadata
}
```

## 🎯 Features

### ✅ Current Features

- **Modular Architecture**: Clean separation of concerns
- **Type-Safe**: Full TypeScript support
- **Responsive**: Mobile-first design
- **Accessible**: Keyboard navigation and ARIA labels
- **Smooth Animations**: Organic, Gaudí-inspired transitions
- **Auto-Scroll**: Intelligent scroll behavior
- **Keyboard Shortcuts**:
  - `⌘K` / `Ctrl+K` - Focus input
  - `Enter` - Send message
  - `Shift+Enter` - New line
  - `⌘B` / `Ctrl+B` - Scroll to bottom
- **Message Actions**:
  - Copy message
  - Retry failed messages
  - Delete messages
  - Feedback (thumbs up/down)
- **Error Handling**: Graceful error states
- **Loading States**: Visual feedback during operations

### 🚧 Coming Soon

- Markdown rendering
- Code syntax highlighting
- Message streaming
- File attachments
- Message threading
- Search within chat
- Export conversation
- Voice input

## 🪝 Custom Hooks

### useChat

Manages chat state and operations.

```typescript
const {
  messages,
  isTyping,
  error,
  isLoading,
  sendMessage,
  retryMessage,
  deleteMessage,
  clearMessages,
} = useChat({
  initialMessages: [],
  onSendMessage: async (content) => {
    // Your logic here
  },
})
```

### useAutoScroll

Manages scroll behavior.

```typescript
const { scrollRef, isAtBottom, scrollToBottom } = useAutoScroll(
  [messages], // Dependencies
  {
    enabled: true,
    smooth: true,
    threshold: 100,
  }
)
```

### useKeyboardShortcuts

Registers keyboard shortcuts.

```typescript
useKeyboardShortcuts({
  enabled: true,
  shortcuts: [
    {
      key: 'k',
      meta: true,
      description: 'Focus input',
      action: () => focusInput(),
    },
  ],
})
```

## 🎨 Styling

The chat interface uses Tailwind CSS and follows these design principles:

- **Colors**: Black/white with subtle grays
- **Typography**: Light font weights for elegance
- **Spacing**: Generous padding, organic flow
- **Borders**: Rounded corners (2xl) for softness
- **Shadows**: Subtle depth on interaction
- **Transitions**: Smooth, purposeful animations

### Customization

```tsx
<ChatInterface
  className="custom-chat"
  // All Tailwind classes work
/>
```

## 🧩 Component Composition

You can compose your own chat interface using the building blocks:

```tsx
import {
  ChatMessage,
  ChatInput,
  ChatWelcome,
  ChatSuggestions,
  TypingIndicator,
  useChat,
  useAutoScroll,
} from '@/components/chat'

function CustomChat() {
  const { messages, sendMessage, isTyping } = useChat()
  const { scrollRef } = useAutoScroll([messages])

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {messages.length === 0 ? (
          <>
            <ChatWelcome />
            <ChatSuggestions suggestions={...} onSelect={...} />
          </>
        ) : (
          messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
        {isTyping && <TypingIndicator />}
      </div>

      <ChatInput value={input} onChange={...} onSend={...} />
    </div>
  )
}
```

## 📚 Utilities

### Message Utilities

```typescript
import {
  createMessage,
  formatTimestamp,
  copyToClipboard,
  validateMessageContent,
  detectCodeBlocks,
  searchMessages,
} from '@/components/chat/utils/message-utils'
```

### Animation Utilities

```typescript
import {
  ANIMATIONS,
  TRANSITIONS,
  getStaggerDelay,
  smoothScrollTo,
} from '@/components/chat/utils/animation-utils'
```

## 🧪 Testing

The chat interface is designed to be testable:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInterface } from '@/components/chat'

test('sends message on button click', () => {
  const onSend = jest.fn()
  render(<ChatInterface onSendMessage={onSend} />)

  const input = screen.getByPlaceholderText(/ask me anything/i)
  const button = screen.getByRole('button', { name: /send/i })

  fireEvent.change(input, { target: { value: 'Hello' } })
  fireEvent.click(button)

  expect(onSend).toHaveBeenCalledWith('Hello')
})
```

## 🎭 Philosophy

Like Gaudí's architecture, this chat interface follows these principles:

1. **Form follows function** - Every element has a purpose
2. **Organic design** - Natural, flowing interactions
3. **Attention to detail** - Thoughtful micro-interactions
4. **Structural beauty** - Clean, readable code
5. **Modular composition** - Parts work independently and together
6. **Timeless design** - Will feel modern years from now

## 📖 Further Reading

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architectural documentation
- [Gaudí's Design Principles](https://en.wikipedia.org/wiki/Antoni_Gaud%C3%AD)

## 🤝 Contributing

When contributing to the chat interface:

1. Follow the architectural patterns
2. Write clean, purposeful code
3. Add tests for new features
4. Update documentation
5. Maintain backward compatibility

## 📄 License

Part of the Lucky project. See root LICENSE file.

---

*"There are no straight lines in nature" - Antoni Gaudí*

*Let our chat interface flow with the same organic beauty.*
