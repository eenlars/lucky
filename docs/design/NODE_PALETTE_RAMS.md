# Node Palette: Rams Design (Corrected)

## What Changed

**Original design:** Shuffling card stack (decorative, game-like)
**Corrected design:** Static vertical list (clear, functional)

**Why?** Rams Principle #4: *"Good design makes a product understandable"*

This is a workflow editor, not a card game. Show all options. No surprises. No randomness.

---

## The Solution

**Vertical list of 3 draggable node cards:**

```
┌─────────────────────┐
│ 🚀  Start           │
│     Begin workflow  │
├─────────────────────┤
│ 🧠  Agent           │
│     AI task         │
├─────────────────────┤
│ ✓✓  End             │
│     Finish workflow │
└─────────────────────┘
    Drag onto canvas
```

**Always visible. Always the same. Zero guessing.**

---

## Rams Principles Applied

✓ **Understandable** - See all 3 options at once
✓ **Honest** - What you see is what you drag
✓ **Minimal** - 3 types (start, agent, end)
✓ **Useful** - Icon + label + description (self-documenting)
✓ **Thorough** - Dark mode, touch-friendly, hover feedback

---

## Why Only 3 Node Types?

**Simplified from 5 → 3:**
- ~~initial-node~~ → **Start**
- ~~transform-node~~ → **Agent** (can handle branching logic internally)
- ~~branch-node~~ → Removed (edge case)
- ~~join-node~~ → Removed (edge case)
- ~~output-node~~ → **End**

**Most workflows:** Start → Agent → Agent → End

Branch/Join still available via right-click for power users.

---

## What Rams Would Say

*"Show all three options. Let users pick intentionally. Don't shuffle them like a dealer."*

*"If branch and join are rarely used, remove them from the default palette. Make the common case effortless."*

*"This will work in 10 years because it's based on clarity, not cleverness."*

**Weniger, aber besser.**
