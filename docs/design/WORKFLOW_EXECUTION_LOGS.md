# Workflow Execution Logs Design Specification

A comprehensive design document defining the visual language, interaction patterns, and technical specifications for workflow execution logging.

> **Purpose:** This document enables implementation of execution visibility—the single most critical trust-building feature for a no-code agentic workflow platform.

> **Scope:** Design-only specification. Implementation follows in subsequent PRs.

---

## Design Principles

**Understandable:** Logs tell a clear story of execution flow
**Minimal:** Show essentials, hide details until requested
**Honest:** Display real data, never fake progress
**Calm:** Logs inform without creating anxiety
**Functional:** Every element serves a purpose

These align directly with [DESIGN_RAMS.md](./DESIGN_RAMS.md) principles—calm competence, purposeful design, thorough execution.

---

## 1. Panel Placement & Behavior

### Recommended: Bottom Panel (VS Code Terminal Pattern)

**Visual Placement:**
- Collapsible panel spanning full canvas width
- Anchored to bottom edge of viewport
- Default height: 30% of viewport (minimum 200px, maximum 60%)
- Resizable via drag handle at top edge

**Interaction:**
- Toggle button in `WorkflowControls.tsx` (toolbar)
- Keyboard shortcut: `Cmd/Ctrl + \`` (backtick, like terminal)
- Panel persists during and after execution
- Collapses but remembers height for next open

**Visual Treatment:**
- Hairline border (1px) at top edge: `var(--gray-200)`
- Background: `var(--white)` (light mode), `var(--dark-bg)` (dark mode)
- No shadow (flat, part of canvas surface)
- Drag handle: 4px tall, centered grip indicator on hover

**Why Bottom Panel:**
- Natural reading flow (workflow top → logs bottom)
- Doesn't occlude workflow nodes
- Familiar pattern (developer tools, terminals)
- Maximizes horizontal space for long log messages

**Alternative Considered:** Right sidebar (rejected—occludes workflow, less space for messages)

---

## 2. Log Entry Structure

### Visual Anatomy

Each log entry is a single line by default, expandable to show details:

```
[HH:MM:SS.mmm] [NodeName] TYPE  Message content
              ↓ Click to expand
              Expanded content area (indented)
```

### Visual Components

**Timestamp:**
- Typography: Caption size (11px), monospace font
- Color: `var(--gray-500)` (secondary text)
- Format: `HH:MM:SS.mmm` (24-hour, millisecond precision)
- Width: Fixed 14ch (preserves alignment in monospace)

**Node Badge:**
- Typography: Body size (14px), medium weight (500)
- Background: Node's theme color at 10% opacity
- Border: 1px solid node's theme color at 30% opacity
- Padding: 2px 8px
- Border radius: 4px (tight, nested element)
- Text color: Node's theme color (high contrast variant)
- Max width: 120px, ellipsis overflow

**Log Type Badge:**
- Typography: Caption size (11px), medium weight (500), uppercase
- Display: Inline after node badge
- Width: Fixed 7ch (preserves alignment)
- Colors: See semantic color table below

**Message:**
- Typography: Body size (14px), regular weight (400)
- Color: `var(--gray-900)` (primary text)
- Line height: 1.5
- Truncation: Max 3 lines, ellipsis overflow
- Wrapping: Word break on long tokens (URLs, IDs)

### Layout

```css
.log-entry {
  display: flex;
  align-items: start;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 0;
  transition: background-color 150ms ease-out;
}

.log-entry:hover {
  background: var(--gray-100);
  cursor: pointer;
}

.log-entry-timestamp {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 11px;
  color: var(--gray-500);
  width: 14ch;
  flex-shrink: 0;
}

.log-entry-node {
  font-size: 14px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-entry-type {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  width: 7ch;
  flex-shrink: 0;
}

.log-entry-message {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: var(--gray-900);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

---

## 3. Semantic Colors & Log Types

### Type Definitions

| Type      | Color           | Icon        | Use Case                                    |
|-----------|-----------------|-------------|---------------------------------------------|
| `INFO`    | `gray-500`      | Circle      | Normal execution steps, status updates      |
| `SUCCESS` | `emerald-500`   | CheckCircle | Node completed successfully                 |
| `WARNING` | `amber-500`     | AlertTriangle | Non-fatal issues, fallbacks, rate limits   |
| `ERROR`   | `red-500`       | XCircle     | Node failed, execution stopped              |
| `DEBUG`   | `blue-500`      | Code        | Detailed technical information (collapsed by default) |

### Color Values

**Light Mode:**
```css
--log-info: oklch(0.56 0 0);           /* gray-500 */
--log-success: oklch(0.60 0.15 145);   /* emerald-500 */
--log-warning: oklch(0.75 0.15 85);    /* amber-500 */
--log-error: oklch(0.55 0.20 25);      /* red-500 */
--log-debug: oklch(0.55 0.18 240);     /* blue-500 */
```

**Dark Mode (Muted):**
```css
--log-info: oklch(0.65 0 0);
--log-success: oklch(0.70 0.12 145);
--log-warning: oklch(0.80 0.12 85);
--log-error: oklch(0.65 0.16 25);
--log-debug: oklch(0.65 0.14 240);
```

### Application

Colors apply **only to type badge and icon**. Message text remains `var(--gray-900)` for consistent readability. This follows Rams principle: "Color with purpose, neutral by default."

**Icon sizing:** 14px × 14px, aligned with type badge baseline, 4px gap.

---

## 4. Real-Time Streaming Behavior

### Auto-Scroll

**Default behavior:**
- New logs append to bottom
- Panel auto-scrolls to show latest entry
- Scroll is smooth (`scroll-behavior: smooth`)

**Pause mechanism:**
- User scrolls up → auto-scroll pauses
- Floating "Jump to latest" button appears at bottom-right
- Button shows count of new logs since pause (e.g., "↓ 5 new")
- Click button → scrolls to bottom, resumes auto-scroll

**Jump to latest button:**
```css
.jump-to-latest {
  position: absolute;
  bottom: 16px;
  right: 16px;
  padding: 8px 12px;
  background: var(--gray-900);
  color: var(--white);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  font-size: 12px;
  font-weight: 500;
  transition: transform 150ms ease-out;
}

.jump-to-latest:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px 0 rgb(0 0 0 / 0.15);
}
```

### Entry Animation

**Appearance:**
- New entries fade in: `opacity 0 → 1` over 150ms
- No sliding, bouncing, or scaling (calm, purposeful)
- Brief highlight flash: background `var(--blue-500)` at 5% opacity for 200ms

```css
@keyframes logEntryAppear {
  0% {
    opacity: 0;
    background: oklch(0.55 0.18 240 / 0.05);
  }
  100% {
    opacity: 1;
    background: transparent;
  }
}

.log-entry-new {
  animation: logEntryAppear 200ms ease-out;
}
```

### Streaming Indicator

**When agent is generating:**
- Show typing indicator inline with current log
- Visual: Three dots pulsing gently (100ms stagger)
- Position: After last log entry from active node
- Remove immediately when complete (no fade-out)

```css
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 10px 16px;
}

.typing-indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gray-400);
  animation: pulse 1.4s ease-in-out infinite;
}

.typing-indicator-dot:nth-child(1) { animation-delay: 0ms; }
.typing-indicator-dot:nth-child(2) { animation-delay: 200ms; }
.typing-indicator-dot:nth-child(3) { animation-delay: 400ms; }

@keyframes pulse {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}
```

---

## 5. Filtering & Search

### Filter Controls

**Toolbar layout:**
- Positioned at top of log panel
- Height: 48px
- Background: `var(--gray-50)` (subtle separation from logs)
- Border bottom: 1px `var(--gray-200)`
- Padding: 8px 16px
- Display: flex, align-items: center, gap: 12px

**Filter types:**

1. **Node filter** (multi-select dropdown)
   - Label: "Node"
   - Shows all nodes in workflow
   - Checkboxes for multi-select
   - Selected count badge on dropdown button
   - Example: "Node (2)" when 2 nodes selected

2. **Log type filter** (multi-select dropdown)
   - Label: "Type"
   - Options: Info, Success, Warning, Error, Debug
   - Color-coded checkboxes (matches semantic colors)
   - Example: "Type (3)" when showing Info, Warning, Error

3. **Clear filters button**
   - Ghost button variant
   - Icon: X (12px)
   - Label: "Clear"
   - Only visible when filters active

**Dropdown pattern:**
```tsx
<Popover>
  <PopoverTrigger asChild>
    <button className="btn-outline h-8 text-sm">
      Node {selectedCount > 0 && `(${selectedCount})`}
      <ChevronDown className="w-3 h-3 ml-2" />
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-56 p-2">
    {nodes.map(node => (
      <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
        <input type="checkbox" checked={selected.includes(node)} />
        <span className="text-sm">{node.name}</span>
      </label>
    ))}
  </PopoverContent>
</Popover>
```

### Search

**Search input:**
- Position: Right side of toolbar, flex: 1, max-width: 320px
- Placeholder: "Search logs..."
- Icon: Search (14px), left side, gray-500
- Keyboard shortcut: `Cmd/Ctrl + F` when panel focused

**Search behavior:**
- Filters logs in real-time as user types
- Case-insensitive
- Matches against message content only (not timestamps or node names)
- Highlights matches in yellow: `background: var(--yellow-500)` at 20% opacity

**Match navigation:**
- Shows count: "3 of 12" in search input right side
- ↑/↓ arrow buttons to navigate matches
- Auto-scrolls to bring match into view
- Current match has darker highlight (40% opacity)

```css
.log-message-highlight {
  background: oklch(0.75 0.15 85 / 0.2);
  border-radius: 2px;
  padding: 0 2px;
}

.log-message-highlight-current {
  background: oklch(0.75 0.15 85 / 0.4);
}
```

---

## 6. Expandable Detail View

### Expanded Layout

**Trigger:** Click anywhere on log entry (full row is clickable)

**Visual changes:**
- Background: `var(--gray-100)` (persistent, not just hover)
- Chevron icon: Rotates 180° (down → up)
- Expanded content area appears below, indented 52px (aligns with message column)

**Expanded content structure:**
```
[Collapsed view]
↓
[Expanded view]
    Input: "User query here..."
    Model: gpt-4-turbo
    Duration: 2.3s | Tokens: 1,234 (prompt: 234, completion: 1,000) | Cost: $0.02
    [Copy] button (top-right)
```

### Content Sections

**Input/Output:**
- Label: Caption size (11px), gray-500, uppercase, semibold
- Content: Body size (14px), gray-900, preserve whitespace
- Max height: 300px, scroll overflow
- Background: `var(--gray-50)`, border: 1px `var(--gray-200)`, border-radius: 6px
- Padding: 12px

**Model Parameters:**
- Display: Inline list, separated by ` | `
- Typography: Caption size (11px), gray-500
- Example: `Duration: 2.3s | Tokens: 1,234 | Cost: $0.02`

**Stack Trace (errors only):**
- Typography: Monospace, 11px
- Color: `var(--red-500)` (error theme)
- Background: `var(--red-500)` at 5% opacity
- Max height: 200px, scroll overflow
- Show full trace, no truncation

### Copy Button

**Position:** Top-right corner of expanded content area

**Visual:**
- Ghost button variant
- Size: Small (28px × 28px)
- Icon: Copy (14px)
- Only visible on hover of expanded area

**Behavior:**
- Copies full log entry as JSON to clipboard
- Feedback: Toast notification "Copied to clipboard" (2s duration, bottom-center)
- JSON structure:
  ```json
  {
    "timestamp": "12:34:56.789",
    "node": "Tokyo",
    "type": "SUCCESS",
    "message": "Generated analysis report",
    "input": "...",
    "output": "...",
    "model": "gpt-4-turbo",
    "duration_ms": 2300,
    "tokens": { "prompt": 234, "completion": 1000 },
    "cost_usd": 0.02
  }
  ```

### Transition

```css
.log-entry-expanded-content {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 200ms ease-out, opacity 200ms ease-out;
}

.log-entry-expanded .log-entry-expanded-content {
  max-height: 1000px; /* Arbitrary large value */
  opacity: 1;
}
```

---

## 7. Execution Session Management

### Session Concept

**Definition:** One session = one workflow run, from start to completion/failure.

**Session metadata:**
- Start timestamp
- Status: Running, Success, Failed
- Duration (if complete)
- Node count
- Total cost (if available)

### Session Selector

**Position:** Top-left of toolbar, before filters

**Visual:**
- Dropdown button, outline variant
- Label format:
  - Current (running): "Running... (3 nodes, 12s)"
  - Recent (success): "Today 2:34 PM (3 nodes, 12s, $0.03)"
  - Recent (failed): "Failed - Today 1:15 PM (2/3 nodes)"
- Width: Auto, max 280px, ellipsis overflow
- Icon: ChevronDown (right side)

**Dropdown content:**
- Shows last 10 sessions
- Format: Same as button label
- Currently viewing session highlighted with `var(--gray-100)` background
- Scroll if >10 sessions
- Divider before "Clear history" option at bottom

```tsx
<Select value={currentSessionId}>
  <SelectTrigger className="w-auto max-w-[280px]">
    {formatSessionLabel(currentSession)}
  </SelectTrigger>
  <SelectContent>
    {sessions.map(session => (
      <SelectItem value={session.id} key={session.id}>
        {formatSessionLabel(session)}
      </SelectItem>
    ))}
    <Separator />
    <SelectItem value="clear" className="text-red-500">
      Clear history
    </SelectItem>
  </SelectContent>
</Select>
```

### Persistence

**Storage mechanism:**
- Browser `localStorage` (key: `workflow-execution-logs-${workflowId}`)
- Structure:
  ```json
  {
    "sessions": [
      {
        "id": "uuid",
        "startTime": "2025-10-13T12:34:01.234Z",
        "endTime": "2025-10-13T12:34:05.623Z",
        "status": "success",
        "nodeCount": 3,
        "totalCost": 0.03,
        "logs": [ /* log entries */ ]
      }
    ]
  }
  ```

**Retention policy:**
- Keep last 10 sessions OR sessions from last 7 days (whichever is fewer)
- Auto-prune on new session creation
- User can manually clear via "Clear history" option (requires confirmation)

**Confirmation dialog:**
- Modal, centered
- Title: "Clear log history?"
- Body: "This will delete all stored execution logs. This cannot be undone."
- Actions: "Cancel" (ghost), "Clear" (destructive)

---

## 8. Empty & Error States

### Empty State: No Execution Yet

**Visual:**
```
[Icon: PlayCircle, 48px, gray-400]

No execution logs yet

Run your workflow to see what happens
```

**Layout:**
- Centered vertically and horizontally in panel
- Icon above text, 16px gap
- Title: Subheading size (18px), gray-900, medium weight
- Body: Body size (14px), gray-500

### Empty State: Cleared Logs

**Visual:**
```
[Icon: Trash2, 48px, gray-400]

Logs cleared

Run your workflow to see fresh logs
```

### Error State: Failed to Load

**Visual:**
```
[Icon: AlertCircle, 48px, red-500]

Could not load execution logs

Try again
```

**"Try again" interaction:**
- Underlined link, gray-900
- On click: Attempts to reload logs from storage
- If successful: Shows logs
- If failed again: Shows error state again with additional message: "If this persists, check browser console."

### Design Rationale

- Minimal text (Rams: brief, clear)
- No decorative illustrations (functional only)
- Clear action if applicable (empowering)
- Centered (draws focus, doesn't look broken)

---

## 9. Performance Considerations

### Virtual Scrolling

**When to use:** Log count exceeds 100 entries

**Library:** `@tanstack/react-virtual` (lightweight, performant)

**Implementation pattern:**
- Render only visible entries + overscan buffer (10 entries above/below viewport)
- Dynamic row heights (collapsed vs expanded)
- Maintain scroll position when expanding/collapsing

**Trade-off:** Slight complexity increase, but essential for 1000+ log workflows.

### Lazy Loading

**Initial load:** Show last 100 logs (most recent)

**Load more:**
- When user scrolls to top, show "Load previous 100" button
- Button appearance:
  ```css
  .load-more {
    width: 100%;
    padding: 12px;
    text-align: center;
    background: var(--gray-50);
    border-bottom: 1px solid var(--gray-200);
    font-size: 12px;
    color: var(--gray-600);
    cursor: pointer;
  }
  .load-more:hover {
    background: var(--gray-100);
  }
  ```
- Click → Loads previous 100, scrolls to first newly loaded entry

### Message Truncation

**Long messages (>300 characters):**
- Truncate to 3 lines in collapsed view
- Show "Show more" link at end (inline, underlined, gray-600)
- Click "Show more" → Expands entry (same as clicking row)

**Full text always visible in expanded view.**

### Density Toggle

**Purpose:** Power users want more logs on screen

**Control:** Toggle button in toolbar (right side)

**Options:**
- **Comfortable (default):** Padding 10px vertical, 3-line message truncation
- **Compact:** Padding 6px vertical, 2-line message truncation, 12px font size

**State persistence:** Stored in `localStorage` (key: `log-panel-density`)

```css
.log-entry-comfortable {
  padding: 10px 16px;
  font-size: 14px;
}

.log-entry-compact {
  padding: 6px 12px;
  font-size: 12px;
}
```

---

## 10. Keyboard Shortcuts

### Shortcut Table

| Shortcut       | Action                             | Context                  |
|----------------|-------------------------------------|--------------------------|
| `Cmd/Ctrl + \`` | Toggle log panel open/closed       | Always available         |
| `Cmd/Ctrl + F` | Focus search input                 | When panel open          |
| `Cmd/Ctrl + K` | Clear logs (confirmation required) | When panel open          |
| `↑ / ↓`        | Navigate search results            | When search active       |
| `Esc`          | Close expanded entry / Exit search | When panel focused       |
| `Space`        | Pause/resume auto-scroll           | When panel scrolling     |

### Visual Indicators

**Tooltips:** Show shortcuts in button/control tooltips
**Example:** Toggle button tooltip: "Logs (Cmd+\`)"

**No separate help modal** (Rams: unobtrusive, self-explanatory)

### Implementation

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === '`') {
      e.preventDefault();
      togglePanel();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'f' && isPanelOpen) {
      e.preventDefault();
      focusSearch();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k' && isPanelOpen) {
      e.preventDefault();
      confirmClearLogs();
    }
    if (e.key === 'Escape' && isPanelOpen) {
      if (isSearchActive) exitSearch();
      else if (expandedEntry) collapseEntry();
    }
    if (e.key === ' ' && isPanelOpen && !isSearchActive) {
      e.preventDefault();
      toggleAutoScroll();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isPanelOpen, isSearchActive, expandedEntry]);
```

---

## 11. Dark Mode Adaptation

### Background Colors

```css
/* Light mode */
.log-panel {
  background: var(--white);
}
.log-entry:hover {
  background: var(--gray-100);
}
.log-entry-expanded-content {
  background: var(--gray-50);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .log-panel {
    background: oklch(0.15 0 0); /* Deep charcoal */
  }
  .log-entry:hover {
    background: oklch(1 0 0 / 0.05); /* Transparent white overlay */
  }
  .log-entry-expanded-content {
    background: oklch(0 0 0 / 0.2); /* Darker inset */
  }
}
```

### Borders

**Light mode:** Solid gray (`var(--gray-200)`)
**Dark mode:** Transparent white overlay (`oklch(1 0 0 / 0.1)`)

This creates softer separation against dark backgrounds, following DESIGN_SYSTEM.md guidance.

### Text Colors

```css
/* Light mode */
--text-primary: var(--gray-900);
--text-secondary: var(--gray-500);

/* Dark mode */
--text-primary: oklch(0.95 0 0);
--text-secondary: oklch(0.65 0 0);
```

### Semantic Colors (Muted)

Dark mode uses less saturated semantic colors to reduce eye strain:

```css
@media (prefers-color-scheme: dark) {
  --log-success: oklch(0.70 0.12 145);
  --log-warning: oklch(0.80 0.12 85);
  --log-error: oklch(0.65 0.16 25);
  /* etc. */
}
```

### Syntax Highlighting (Expanded JSON)

**Light mode:** Standard syntax colors (blue for keys, green for strings, etc.)
**Dark mode:** Muted versions, high contrast without harshness

Reference VS Code "Dark+" theme for guidance.

---

## 12. Mobile Responsiveness

### Breakpoint: 768px

**Below 768px (mobile):**

**Panel behavior:**
- Bottom panel → Full-screen modal overlay
- Triggered by same button in `WorkflowControls`
- Slides up from bottom with backdrop blur
- Backdrop: `rgba(0, 0, 0, 0.5)` + `backdrop-filter: blur(8px)`

**Modal structure:**
```tsx
<div className="fixed inset-0 z-50 md:hidden">
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
  <div className="absolute inset-x-0 bottom-0 h-[90vh] bg-white rounded-t-2xl">
    {/* Log panel content */}
  </div>
</div>
```

**Header bar (mobile only):**
- Height: 56px
- Background: `var(--gray-50)`
- Border bottom: 1px `var(--gray-200)`
- Layout: Flex, space-between
- Left: "Execution Logs" title (subheading size)
- Right: Close button (X icon, 24px)

**Simplified toolbar:**
- Session selector (full width, stacked)
- Filters collapse into "Filters" menu button (opens drawer)
- Search remains visible (smaller, full width)

**Touch optimization:**
- Tap targets: Minimum 44px × 44px
- Log entries: Increased padding (14px vertical)
- Swipe down on header → Closes modal
- Pull-to-refresh → Reloads current session

### Touch Gestures

**Swipe to expand/collapse:**
- Swipe right on log entry → Expands
- Swipe left on expanded entry → Collapses
- Visual feedback: Entry translates slightly during swipe

**Pull-to-refresh:**
- Only when scrolled to top
- Rubber-band effect
- Spinner during refresh

### Responsive Layout

```css
/* Desktop */
.log-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30vh;
  max-height: 60vh;
  min-height: 200px;
}

/* Mobile */
@media (max-width: 767px) {
  .log-panel {
    position: fixed;
    inset: 0;
    height: 100vh;
    border-radius: 16px 16px 0 0;
  }
}
```

---

## 13. Integration with Existing UI

### WorkflowControls.tsx Integration

**Add "Logs" toggle button:**

**Position:** After existing control buttons (Run, Stop, etc.)

**Visual:**
```tsx
<button
  onClick={toggleLogPanel}
  className={cn(
    "btn-ghost h-9 px-3",
    isLogPanelOpen && "bg-gray-100" // Active state
  )}
>
  <Terminal className="w-4 h-4" />
  <span className="ml-2 text-sm font-medium">Logs</span>
  {errorCount > 0 && (
    <Badge variant="destructive" className="ml-2 h-5 px-2 text-xs">
      {errorCount}
    </Badge>
  )}
</button>
```

**Error count badge:**
- Only shown when workflow has errors
- Counts ERROR-type logs in current session
- Updates in real-time as errors appear
- Red background (`var(--red-500)`), white text

**Keyboard shortcut indicator:**
- Tooltip: "Logs (Cmd+\`)"

### Node Status Indicator Integration

**When node is running:**
- Clicking node → Scrolls log panel to that node's latest log
- If panel closed, opens panel first

**When node errors:**
- Clicking node → Opens log panel + filters to that node + scrolls to error log
- Error log is auto-expanded

**Implementation:**
```tsx
const handleNodeClick = (nodeId: string) => {
  if (!isLogPanelOpen) openLogPanel();
  if (nodeStatus === 'error') {
    setNodeFilter([nodeId]);
    setTypeFilter(['ERROR']);
    scrollToLastErrorForNode(nodeId);
    expandLog(lastErrorLogId);
  } else {
    scrollToLastLogForNode(nodeId);
  }
};
```

**Visual connection:** Node border flashes briefly (`var(--blue-500)` pulse) when log panel scrolls to its logs.

### Error State Simplification

**Current pattern:**
- Workflow shows "Failed to fetch" with "Try again" link
- User doesn't know why it failed

**New pattern:**
- Workflow shows error state with "View logs" link
- Click → Opens log panel, filtered to errors, scrolled to failure point
- User sees: Which node failed, why (error message), when (timestamp)

**Example error log entry:**
```
[12:34:56.789] [Tokyo] ERROR  API request failed: Rate limit exceeded (429)
              ↓ Expanded automatically
              Request: POST /api/analyze
              Response: {"error": "Rate limit exceeded. Retry after 60s."}
              Model: gpt-4-turbo
              Duration: 0.3s | Cost: $0.00
```

User now understands: "Tokyo node hit rate limit, needs retry logic."

---

## 14. Accessibility

### Semantic HTML

**Structure:**
```html
<section aria-label="Workflow execution logs" role="log">
  <div role="toolbar" aria-label="Log controls">
    <!-- Filters, search, session selector -->
  </div>
  <div role="list" aria-live="polite" aria-atomic="false">
    <!-- Log entries -->
    <article role="listitem" aria-label="Log entry">
      <!-- Entry content -->
    </article>
  </div>
</section>
```

**Why `aria-live="polite"`:** Screen readers announce new logs without interrupting current speech.

### Keyboard Navigation

**Full keyboard support:**
- Tab: Navigate between toolbar controls
- Enter/Space: Activate buttons, expand log entries
- Arrow keys: Navigate search results
- Escape: Close expanded entry, exit search

**Focus management:**
- Focus ring: 3px, `var(--gray-500)` at 50% opacity, 2px offset
- Focus visible on all interactive elements
- Focus trap when search is active (Escape to exit)

### Screen Reader Support

**Announcements:**
- New log entry: "New log: [Node name], [Type], [Message]"
- Debounced: Announce batch if >5 logs in 1 second ("5 new logs")
- Error logs: Announced immediately (not debounced)

**ARIA labels:**
```tsx
<button
  aria-label="Toggle execution logs panel"
  aria-expanded={isLogPanelOpen}
  aria-controls="log-panel"
>
  Logs
</button>

<div id="log-panel" role="region" aria-labelledby="log-panel-title">
  <h2 id="log-panel-title" className="sr-only">Execution Logs</h2>
  {/* Panel content */}
</div>
```

### High Contrast Mode

**Support `prefers-contrast: high`:**
```css
@media (prefers-contrast: high) {
  .log-entry {
    border: 1px solid var(--gray-900);
  }
  .log-entry:hover {
    border-color: var(--blue-500);
  }
}
```

### Reduced Motion

**Support `prefers-reduced-motion: reduce`:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Respects user preferences (Rams principle: honest, considerate design).**

---

## 15. Example: Complete Log Flow

Imagine a user runs a 3-node workflow (Tokyo → Paris → London):

```
[12:34:01.234] [Start] INFO   Workflow execution started
[12:34:01.456] [Tokyo] INFO   Processing initial query
              ↓ Input: "Analyze Q4 sales data for EMEA region"
              Model: gpt-4-turbo | Duration: 2.3s | Tokens: 1,234 | Cost: $0.02
[12:34:03.789] [Tokyo] SUCCESS Generated analysis report
[12:34:03.800] [Paris] INFO   Reviewing analysis for accuracy
              ↓ Model: claude-3-sonnet | Duration: 1.8s | Tokens: 890 | Cost: $0.01
[12:34:05.612] [Paris] SUCCESS Review complete
[12:34:05.623] [Paris] WARNING Output length exceeds recommended limit (4,500 words)
[12:34:05.650] [London] INFO  Formatting final report
              ↓ Model: gpt-4-turbo | Duration: 1.2s | Tokens: 456 | Cost: $0.01
[12:34:06.891] [London] SUCCESS Formatting complete
[12:34:06.900] [End]   SUCCESS Workflow completed in 5.7s | Total cost: $0.04
```

**User sees:**
1. Exactly what happened (clear sequence)
2. Why it happened (inputs shown on expand)
3. How long it took (timestamps + durations)
4. What it cost (per-node + total)
5. Warning about output length (non-fatal, informative)

**User thinks:** "This tool respects my intelligence. I'm in control. I trust this."

**That's when they recommend it.**

---

## 16. Implementation Phases

This design enables phased implementation (small, reviewable PRs):

### Phase 1: Static UI (Mock Data)
**Deliverables:**
- Log panel component (bottom panel, toolbar, empty state)
- Log entry component (collapsed view only)
- Session selector (static, no persistence)

**Acceptance criteria:**
- Panel toggles open/closed
- Shows 10 mock log entries
- Hover states work
- Keyboard shortcut (Cmd+\`) toggles panel

**Estimated effort:** 8-12 hours

---

### Phase 2: Expandable Entries & Metadata
**Deliverables:**
- Expand/collapse interaction
- Expanded content area (input/output, metadata)
- Copy button

**Acceptance criteria:**
- Click entry → Expands
- Shows metadata (duration, tokens, cost)
- Copy button copies JSON to clipboard

**Estimated effort:** 6-8 hours

---

### Phase 3: Real-Time Streaming
**Deliverables:**
- Connect to workflow runner
- Auto-scroll behavior
- Streaming indicator

**Acceptance criteria:**
- Logs appear in real-time during execution
- Auto-scroll works
- "Jump to latest" appears when user scrolls up

**Estimated effort:** 10-14 hours

---

### Phase 4: Filtering & Search
**Deliverables:**
- Node filter (multi-select)
- Log type filter (multi-select)
- Search input + match navigation

**Acceptance criteria:**
- Filters work independently and combined
- Search highlights matches
- ↑/↓ navigate matches

**Estimated effort:** 12-16 hours

---

### Phase 5: Session History & Persistence
**Deliverables:**
- Session selector (functional)
- localStorage persistence
- Load historical logs

**Acceptance criteria:**
- Switching sessions loads correct logs
- Logs persist after page refresh
- "Clear history" works with confirmation

**Estimated effort:** 8-10 hours

---

### Phase 6: Performance & Polish
**Deliverables:**
- Virtual scrolling (>100 logs)
- Lazy loading ("Load more" button)
- Density toggle
- Mobile responsive layout

**Acceptance criteria:**
- 1000+ logs render smoothly
- Mobile modal works on touch devices
- Density toggle persists preference

**Estimated effort:** 12-16 hours

---

**Total estimated effort:** 56-76 hours (7-10 days for one engineer)

---

## 17. Success Metrics

**This design succeeds if:**

1. **Implementation clarity:** Engineer can build without asking design questions
2. **Rams alignment:** Design is calm, minimal, purposeful (passes "Rams audit")
3. **User comprehension:** Users understand execution at a glance (no hunting)
4. **Demo-worthy:** Visual polish makes this a showcase feature
5. **Extensible:** Future engineers can add log types/features without breaking aesthetic

---

## 18. References & Inspiration

### Good Examples
- **Chrome DevTools Console:** Clear hierarchy, expandable entries, filtering
- **VS Code Terminal:** Bottom panel, auto-scroll, copy on click
- **Vercel Deployment Logs:** Clean, real-time, semantic colors
- **Linear Issue Timeline:** Minimal, chronological, clear actors

### Anti-Patterns (Avoid)
- **AWS CloudWatch:** Overwhelming, poor hierarchy, hard to scan
- **Jenkins Console:** Wall of text, no structure
- **Generic terminal dumps:** No color coding, no interaction
- **Cluttered dashboards:** Too much data, no focus

### Related Documents
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Visual language foundation
- [DESIGN_RAMS.md](./DESIGN_RAMS.md) - Design philosophy
- [DESIGN_CODE.md](./DESIGN_CODE.md) - Technical implementation patterns

---

## 19. Final Note

This is a **design-only PR**. The output is comprehensive documentation. The goal is to create such clear, detailed design specs that implementation becomes straightforward and multiple engineers can work on different parts (panel, filtering, history) without coordination overhead.

**Think like Dieter Rams designing a control panel:** Every element serves a clear purpose. Nothing is decorative. The user feels calm and in control even when debugging complex workflows.

**The user should feel:** "I understand exactly what my workflow did. I can fix it. I trust this system."

---

**Document version:** 1.0
**Word count:** ~3,900
**Created:** 2025-10-13
**Author:** Design specification for Lucky workflow execution logs
