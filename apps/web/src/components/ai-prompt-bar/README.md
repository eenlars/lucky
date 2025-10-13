# AI Prompt Bar Component

## Overview
The AI Prompt Bar is a **reusable component** for integrating AI-powered editing capabilities into any configuration page. It provides a clean, context-agnostic interface for users to modify configurations using natural language.

## Implementation Approach

### Why the Simplified Approach?
We chose a **simplified JSON-based approach** over the complex artifact streaming for several reasons:

1. **Simplicity**: Direct JSON request/response is easier to understand and debug
2. **Compatibility**: Works with any backend without requiring specific streaming libraries
3. **Reliability**: Less moving parts means fewer potential failure points
4. **Flexibility**: Easy to adapt to different data structures and contexts

### Architecture

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│  Component  │──────▶│  PromptBar   │──────▶│   AI API     │
│   (MCP,     │       │  (Generic)   │       │  (/api/ai/   │
│  Workflow)  │◀──────│              │◀──────│   simple)    │
└─────────────┘       └──────────────┘       └──────────────┘
      ▲                                              │
      │                                              ▼
      └──────────────  Config Updates  ──────  OpenAI GPT-4
```

## Usage

### 1. Create a Context Object

```typescript
const context: PromptBarContext = {
  contextType: "mcp-config",  // Identifies the type of configuration
  getCurrentState: async () => config,  // Returns current config
  applyChanges: async (changes) => {    // Applies AI-generated changes
    updateConfig(changes)
    toast.success("Configuration updated")
  },
  apiEndpoint: "/api/ai/simple",  // API endpoint for AI processing
  placeholder: "Tell me how to modify...",  // Custom placeholder text
  mode: "edit",  // "edit", "run", or "both"
  position: "fixed",  // Positioning: "bottom", "top", or "fixed"
  className: "custom-classes",  // Additional CSS classes
}
```

### 2. Add the Component

```tsx
<PromptBar context={context} />
```

## API Endpoint

The `/api/ai/simple` endpoint handles AI requests with a simple contract:

**Request:**
```json
{
  "contextType": "mcp-config",
  "prompt": "Add a Tavily search server",
  "currentState": { /* current config */ },
  "operation": "edit"
}
```

**Response:**
```json
{
  "success": true,
  "changes": { /* updated config */ },
  "explanation": "Added Tavily search server..."
}
```

## Features

- ✅ **Reusable** across different configuration pages
- ✅ **Context-aware** AI understands different config types
- ✅ **JSONC support** for configurations with comments
- ✅ **Clean UI** with loading states and error handling
- ✅ **Keyboard shortcuts** (Cmd/Ctrl+K to focus, Cmd/Ctrl+Enter to submit)
- ✅ **Responsive design** with dark mode support

## Adding to New Pages

1. Import the component and types:
```typescript
import { PromptBar, type PromptBarContext } from "@/components/ai-prompt-bar/PromptBar"
```

2. Create your context with appropriate handlers
3. Add system prompts for your context type in `/api/ai/artifact`

## Testing

Test the component by running the development server and navigating to the MCP servers page:
```bash
# Start the dev server
bun run dev

# Navigate to /connectors and test the AI prompt bar
```

## Future Improvements

While the current implementation works well, potential enhancements could include:
- Streaming responses for real-time feedback
- Undo/redo functionality
- Diff view for changes
- Multiple AI model support

The simplified approach provides a solid foundation that can be enhanced as needed without over-engineering the initial implementation.