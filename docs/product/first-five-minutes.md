# First Five Minutes

## The Only Question That Matters

**What's blocking users from getting value in under 5 minutes?**

This document tracks the critical path from "new user arrives" to "user gets real value." Everything else is secondary.

## The Five-Minute Journey (Current State)

1. **Sign in** (0:00)
   - Land on homepage
   - Clerk authentication (GitHub, Google, or email)
   - Redirect to dashboard

2. **View existing workflows or create** (0:30)
   - See: Workflow list with examples
   - Click "Create" → Navigate to `/edit`
   - See: Empty workflow editor

3. **Configure first node** (1:00)
   - Write system prompt
   - Select model
   - Choose tools
   - Set up handoffs

4. **Test the workflow** (3:00)
   - Click "Test" or "Run"
   - Enter input
   - Wait for execution
   - See results in real-time

5. **Get value** (4:30)
   - Workflow completes successfully
   - User sees useful output
   - View execution trace and costs
   - **OR** workflow fails with clear error message

## Current Blockers

### 1. Provider Configuration
**Status**: ✅ **RESOLVED** - Workflows can now run without Supabase using `USE_MOCK_PERSISTENCE=true`

**Remaining improvements**:
- Better error message pointing to `/settings` when API keys are missing
- Clearer documentation about required environment variables
- UI indicator showing which providers are configured

### 2. Tool-Use Reliability
**Problem**: Tool calls fail or hallucinate parameters

**Impact**: Workflows execute but produce garbage

**Fix needed**: (PRIORITY)
- Better tool schema validation
- Clearer tool descriptions
- Better few-shot examples in prompts

### 3. Workflow Creation Complexity
**Problem**: Too many decisions before first run

**Impact**: Analysis paralysis, users quit

**Fix needed**:
- Templates: "Customer Email Reply", "Research Summarizer", "Data Extractor"
- One-click workflow creation with sensible defaults
- Edit after testing, not before

### 4. Error Messages
**Problem**: When things break, users don't know why

**Impact**: Users can't self-serve, need support

**Fix needed**:
- "API key not configured" → Link to settings with step-by-step
- "Tool call failed" → Show what went wrong, suggest fixes
- "Timeout" → Explain budget settings, how to adjust

### 5. First-Run Experience
**Status**: 🟡 **PARTIALLY RESOLVED** - Auth is working, examples exist

**Remaining improvements**:
- More visible sample workflows on dashboard
- Quick-start templates ("Customer Email Reply", "Research Summarizer")
- Video/GIF showing a successful run
- "Try this example" one-click workflow execution

## Success Metrics

A successful five-minute experience:

1. **User runs a workflow** (not just creates one)
2. **Gets useful output** (not an error)
3. **Understands what happened** (not confused)
4. **Wants to run it again** (sees the value)

## The Pragmatic Path

We're NOT trying to make workflows that self-evolve in 5 minutes. That's the vision.

We're trying to make workflows that **solve a real problem** in 5 minutes.

Evolution comes later, after:
- Tool-use is reliable
- Execution is predictable
- Users trust the system
- We have usage data to guide evolution

## Next Actions

1. **Audit the current path** - Record a new user session, time each step
2. **Identify the #1 blocker** - What kills most user sessions?
3. **Ship one fix per week** - Improve one thing at a time
4. **Measure bounce rate** - Track where users quit
5. **Talk to users** - What confused them most?

## The Test

Can a developer who's never seen this before:
- Clone the repo: `git clone https://github.com/eenlars/lucky.git`
- Install: `bun install`
- Configure: `cp .env.example .env.local` and add API keys
- Run a workflow: `USE_MOCK_PERSISTENCE=true bun -C packages/core run once`
- Get valuable output

In under 5 minutes?

**Current status**: ✅ Yes, for core workflows (no Supabase required)
**Remaining work**: Streamline UI first-run experience

---

*This document should be updated weekly based on actual user feedback and metrics.*
