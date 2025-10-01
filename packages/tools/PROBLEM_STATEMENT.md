# Tool System Problem Statement

## The Real Goal

Build a **developer experience layer on top of AI SDK's tool system** that makes it trivial to:

1. Create tools with proper structure
2. Test tools in isolation (unit tests)
3. Test tools without calling LLMs (simulation)
4. Connect tools to workflows at runtime

This is **not** about building a marketplace or app store - that's far future. This is about making the development workflow smooth and the testing story solid.

## Current State: AI SDK Tools

The AI SDK provides a tool system:

```javascript
import { tool } from "ai"
import { z } from "zod"

const weatherTool = tool({
  description: "Get weather for a location",
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    // actual implementation
    return { temperature: 72, conditions: "sunny" }
  },
})

// Use with AI SDK
const result = await generateText({
  model: openai("gpt-4"),
  tools: { weather: weatherTool },
  prompt: "What's the weather in NYC?",
})
```

**What's missing:**

- ❌ No clear pattern for testing tools
- ❌ No way to simulate tool responses without LLM calls
- ❌ No template/framework for creating tools consistently
- ❌ No clear way to organize many tools
- ❌ No runtime registry to connect workflows to tools

## What We Need to Build

### 1. Tool Development Framework ✅ (Mostly exists)

**Need:** Clear patterns and helpers for creating tools

```javascript
// What we want developers to write
const weatherTool = defineTool({
  name: "get-weather",
  description: "Get weather for a location",
  parameters: z.object({
    location: z.string().describe("City name"),
  }),
  execute: async (params, context) => {
    // Implementation with context
    const { location } = params
    const weather = await fetchWeather(location)
    return weather
  },
})
```

**Questions:**

- What helpers/utilities should `defineTool()` provide?
- What context should be injected? (logging, tracing, etc.)
- How do we handle errors consistently?
- Should there be lifecycle hooks? (beforeExecute, afterExecute)

### 2. Unit Testing Framework ⚠️ (Critical Gap)

**Need:** Easy way to write unit tests for tools

```javascript
// What we want
import { testTool } from "@lucky/tools/testing"

describe("weather tool", () => {
  it("returns weather for valid location", async () => {
    const result = await testTool(weatherTool, {
      params: { location: "NYC" },
      context: {
        /* mock context */
      },
    })

    expect(result.temperature).toBeDefined()
    expect(result.conditions).toBeDefined()
  })

  it("handles invalid location", async () => {
    await expect(
      testTool(weatherTool, {
        params: { location: "InvalidCity" },
      }),
    ).rejects.toThrow("Invalid location")
  })
})
```

**Questions:**

- What testing utilities do we provide?
- How do we mock external dependencies?
- How do we assert on tool outputs?
- Should we provide fixtures/factories?
- How do we test parameter validation?
- How do we test context injection?

### 3. Simulation/Mocking System ⚠️ (Critical Gap)

**Need:** Test tool behavior without calling LLMs or external services

```javascript
// Scenario 1: Mock the entire tool
const mockWeather = simulateTool(weatherTool, {
  returns: { temperature: 72, conditions: "sunny" },
})

// Scenario 2: Mock only external calls
const weatherWithMock = withMocks(weatherTool, {
  fetchWeather: async location => ({ temperature: 72 }),
})

// Scenario 3: Record and replay
const recording = await recordTool(weatherTool, {
  params: { location: "NYC" },
})
// Later...
const replay = replayTool(recording)
```

**Questions:**

- How do we intercept tool execution?
- How do we mock specific function calls?
- Should we support recording real executions?
- How do we handle async/streaming tools?
- How do we simulate different scenarios (success, error, timeout)?
- Should simulations be stored as fixtures?

### 4. Tool Registry (Communication Layer) 🔄 (Needs Redesign)

**Need:** Runtime system to connect workflows to tools

**This is NOT a marketplace** - it's just the connection layer between:

- Workflow says: "I need tools X, Y, Z"
- Registry says: "Here are instances of X, Y, Z for you"

```javascript
// Setup phase (app startup)
const registry = createToolRegistry()

registry.register(weatherTool)
registry.register(emailTool)
registry.register(searchTool)
// ... register all available tools

await registry.initialize() // validate, connect MCP, etc.

// Runtime phase (workflow execution)
const workflowTools = registry.getTools(
  ["get-weather", "send-email"], // tool names the workflow needs
  { workflowId, userId /* execution context */ },
)

// workflowTools is AI SDK compatible
const result = await generateText({
  model: openai("gpt-4"),
  tools: workflowTools,
  prompt: "...",
})
```

**Questions:**

- How should tools be stored internally? (not Map - but what?)
- How do we look up tools by name efficiently?
- How do we handle tool not found?
- How do we create isolated instances per workflow?
- How do we pass execution context to tools?
- Should registration support batching?
- How do we support lazy loading?

### 5. Future Needs (Later)

These are explicitly out of scope for now but we should keep in mind:

- ⏭️ Tool discovery/search
- ⏭️ Tool versioning
- ⏭️ Tool dependencies
- ⏭️ Remote tool sources
- ⏭️ Access control
- ⏭️ Tool marketplace/publishing

## Core Architecture Questions

### Registry Data Structure

**Current approach (Map):**

```javascript
this.tools = new Map() // toolName -> toolDefinition
```

**Problems you identified:**

- What if we need external service invocation (sandbox)?
- What if different agents need different tool subsets?
- What if we want hierarchical search with embeddings later?
- Doesn't support future expansion

**Options to consider:**

```javascript
// Option 1: Separate storage from lookup
class ToolRegistry {
  storage = new ToolStorage() // abstract storage
  index = new ToolIndex()     // abstract indexing

  register(tool) {
    this.storage.save(tool)
    this.index.add(tool)
  }

  get(name) {
    return this.storage.load(this.index.lookup(name))
  }
}

// Option 2: Registry as interface, many implementations
interface IToolRegistry {
  register(tool): void
  get(names): ToolInstances
  query(criteria): ToolInstances
}

class InMemoryRegistry implements IToolRegistry { }
class EmbeddingRegistry implements IToolRegistry { }
class RemoteRegistry implements IToolRegistry { }

// Option 3: Composition-based
class ToolRegistry {
  // Registry delegates to adapters
  adapters: ToolAdapter[]

  register(tool) {
    // Routes to appropriate adapter
  }
}
```

**What approach fits your vision?**

## Immediate Questions to Answer

### For Tool Testing Framework:

1. **Test runner integration** - Should this work with any test framework (Vitest, Jest, etc.) or be opinionated?

2. **Mock strategy** - Should we use dependency injection, monkey patching, or something else?

3. **Fixture management** - How do we organize test fixtures and mock data?

4. **Assertion helpers** - What tool-specific assertions do we need?

### For Simulation System:

1. **Simulation mode** - Environment variable? Configuration? Explicit API?

2. **Simulation storage** - Where do simulated responses live? (files, in-memory, database?)

3. **Simulation matching** - How do we match a tool call to its simulation?

4. **Simulation coverage** - How do we know if all code paths are covered by simulations?

### For Registry Architecture:

1. **Storage abstraction** - What is the interface between registry and storage?

2. **Lookup optimization** - What operations need to be fast?

3. **Extension points** - Where do we need plugin/adapter hooks?

4. **Failure modes** - What happens when tools fail to register/initialize?

## Success Criteria

A successful implementation should:

1. ✅ Developer can create a new tool in <5 minutes using clear patterns
2. ✅ Developer can write unit tests for tools without mocking complexity
3. ✅ Developer can simulate tool responses for integration testing
4. ✅ Workflow can request specific tools and get isolated instances
5. ✅ System works with AI SDK with zero friction
6. ✅ Architecture supports future extension without breaking changes

## What to Design Next

We need to nail down:

1. **Testing framework API** - What does `testTool()`, `simulateTool()`, etc. look like?
2. **Registry architecture** - What's the right abstraction that's not just a Map?
3. **Tool organization** - How do we organize 50+ tools in a project?

**Which of these should we tackle first?**
