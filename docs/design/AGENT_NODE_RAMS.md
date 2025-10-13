# Agent Node Design: Rams Analysis

## What Users Actually Want

When looking at an agent node in a workflow, users need to know:

1. **What does this agent do?** (Primary task/prompt)
2. **Which AI model runs it?** (GPT-4, Claude, etc.)
3. **What can it access?** (Tools it can use)
4. **What's happening now?** (Status: idle, running, done, failed)
5. **How do I change it?** (Quick edit access)

---

## Current State (Good Foundation)

**What's already there:**
- ✅ Node ID/name (editable)
- ✅ Model indicator
- ✅ Description field
- ✅ Tools list (with overflow handling)
- ✅ Click to edit in dialog
- ✅ Delete button on hover

**What's missing:**
- ❌ Visual icon (Brain) to match palette
- ❌ Clear hierarchy (everything is gray text)
- ❌ Prompt preview prominence
- ❌ Color coding to match palette aesthetic

---

## Rams Would Ask

### "What's the most important information?"

**The prompt.** That's what the agent does. Everything else is secondary.

**Current hierarchy:**
1. Node ID (top, bold)
2. Model (tiny, gray)
3. Description/prompt (small, gray)
4. Tools (badges)

**Better hierarchy:**
1. **Description/prompt** (large, primary)
2. Node ID (small label)
3. Model + Tools (metadata, compact)
4. Status (visual indicator, not text)

### "Is this honest?"

Current node looks generic. But when you drag an "Agent" from the palette with a blue Brain icon, you expect **blue + Brain** on canvas.

**Make it match:** Blue accent, Brain icon, consistent with palette.

### "Is this thorough?"

Missing details:
- **System prompt vs description** - Are these the same? Clarify
- **Token usage** - Should users see cost?
- **Last run time** - When did this last execute?

Don't add these unless users ask. Start minimal, add only what serves.

### "Is this understandable?"

**Test:** Can a new user look at the node and immediately know:
- What this agent does? → **Needs prominence**
- What model it uses? → **Yes, but tiny**
- If it's working? → **Status indicator exists but might not be obvious**

---

## Proposed Improvements (Minimal)

### 1. Add Brain Icon (Matches Palette)
```tsx
<div className="flex items-center gap-2">
  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
    <Brain className="size-4 text-blue-600 dark:text-blue-400" />
  </div>
  <h3 className="text-sm font-semibold">{nodeId}</h3>
</div>
```

**Why:** Visual consistency with palette. User sees blue Brain in palette, should see blue Brain on canvas.

### 2. Emphasize Description (Primary Info)
```tsx
<p className="text-sm font-medium text-gray-900">
  {description || systemPrompt || "No task defined"}
</p>
```

**Why:** This is what the agent does. Make it readable, not buried.

### 3. Compact Metadata
```tsx
<div className="flex items-center gap-3 text-[10px] text-gray-500">
  <span>{modelName}</span>
  <span>•</span>
  <span>{totalTools} tools</span>
</div>
```

**Why:** Model + tool count is metadata. Show it, but don't let it dominate.

### 4. Status via Border Color
```tsx
<BaseNode className={cn(
  "border-2 rounded-xl",
  status === "running" && "border-blue-500 shadow-lg",
  status === "success" && "border-green-500",
  status === "error" && "border-red-500",
  !status && "border-gray-200"
)}>
```

**Why:** Subtle but immediate. Blue border = running. Green = success. Red = error.

---

## What NOT to Add

❌ **Animations** - Status changes should be instant (200ms max)
❌ **Progress bars** - Unless users specifically need them
❌ **Tooltips** - If you need a tooltip to explain, the label is wrong
❌ **Extra buttons** - One action: click to edit. Don't add "Run", "Duplicate", etc. unless needed

---

## Rams Standard Applied

**1. Innovative?**
✓ Blue Brain icon + clearer hierarchy = more useful than generic box

**2. Useful?**
✓ Shows primary task (description) prominently
✓ Shows model + tools compactly
✓ Click to edit (single interaction)

**3. Aesthetic?**
✓ Matches palette color scheme (blue)
✓ Proportional spacing
✓ Clear visual hierarchy

**4. Understandable?**
✓ Brain icon = AI agent (universal)
✓ Description tells you what it does
✓ Border color shows status

**5. Unobtrusive?**
✓ Neutral colors until status changes
✓ Delete button hidden until hover
✓ Metadata is small, readable but not dominant

**6. Honest?**
✓ Looks like what you dragged from palette
✓ Shows actual model name (not simplified)
✓ Tool count is accurate

**7. Long-lasting?**
✓ Icon + text = timeless
✓ Color coding = established pattern
✓ No trendy effects

**8. Thorough?**
✓ Brain icon for visual identity
✓ Status via border (subtle but clear)
✓ Dark mode support

**9. Environmentally Friendly?**
✓ No unnecessary animations
✓ Efficient rendering

**10. Minimal?**
✓ One primary action (click to edit)
✓ Essential info only
✓ No button clutter

---

## Implementation Priority

**Phase 1: Visual Consistency (30 min)**
- Add Brain icon to match palette
- Apply blue accent color scheme
- Border color based on status

**Phase 2: Hierarchy (15 min)**
- Make description larger/bolder
- Reduce model/tools to metadata size
- Clear visual separation

**Phase 3: Test (15 min)**
- Drag from palette → should look like what you dragged
- Click node → should open edit dialog
- Run workflow → status border should update

---

## What Rams Would Say

*"The node should show what the agent does. That's the most important thing. Model and tools are details—show them, but don't let them compete with the task itself."*

*"If you dragged a blue Brain from the palette, the node on canvas should have a blue Brain. That's honest design."*

*"Status should be obvious at a glance. A colored border is enough—don't add extra UI."*

*"One action: click to edit. Don't add buttons for every possible operation. Keep it simple."*

**Weniger, aber besser.**
