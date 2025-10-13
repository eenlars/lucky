# Store Inspector (Dev Only)

Development tool for inspecting Zustand stores in real-time.

## Access

- **URL**: `/dev`
- **Visibility**: Development mode only (`NODE_ENV=development`)
- **Sidebar**: Developer (bottom of sidebar, Code icon)

## Features

### Three View Modes

1. **State** - Data only, no functions. Clean view of current store state.
2. **Actions** - Interactive action dispatch with parameter inputs and execution history.
3. **Raw** - Full dump including marked functions.

### Action Dispatch

The Actions tab now includes:
- **Expandable cards** for each action with parameter details
- **Input fields** for parameters (JSON or comma-separated)
- **Execute button** to call actions with provided params
- **Execution history** showing success/error status, timestamps, and results
- **Async indicators** for async actions (blue badge)

### Controls

- **Auto/Manual** - Toggle auto-refresh (500ms) or manual refresh
- **Copy JSON** - Copy current view to clipboard (prominent button)
- **Count badges** - Shows number of state fields and actions

## Available Stores

| Store | Icon | Description |
|-------|------|-------------|
| Workflow Store | Network | Workflows & state |
| Model Preferences | Settings | Model settings |
| Run Config | Play | Execution config |
| Profile Store | User | User data |
| MCP Config | Plug | Tool config |
| Evolution Runs | History | Run history |
| Evolution UI | TrendingUp | UI state |
| Connectors UI | Layout | UI state |

## Pattern

Follows Redux DevTools / Zustand DevTools conventions:
- Separate state from actions
- Show function signatures
- Real-time updates
- Collapsible views
