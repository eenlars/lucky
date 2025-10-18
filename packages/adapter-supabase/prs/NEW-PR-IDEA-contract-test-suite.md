# Persistence Adapter Contract Compliance Test Suite

## Five Ideas Considered

**Idea 1: Unified Error Taxonomy**
Create domain-specific error classes that replace all raw Supabase errors.
Rejected: Adds error classes without removing code. Increases surface area.

**Idea 2: Nullability Coercion Layer**
Create typed helpers to convert between JavaScript undefined and Postgres null.
Rejected: Tactical fix for type errors, doesn't improve architecture. The anti-corruption boundary PRs will handle this properly.

**Idea 3: Query Pattern Consolidation**
Create query builder helpers for common patterns.
Rejected: Adds abstraction on top of Supabase SDK. Increases indirection without clear value.

**Idea 4: ID Generation Strategy**
Consolidate scattered ID generation into single helper.
Rejected: Too small. 30-minute refactor, not a structural improvement.

**Idea 5: Persistence Contract Compliance Test Suite**
Create executable specification that both SupabasePersistence and InMemoryPersistence must pass.
Selected: Prevents implementation drift, acts as living documentation, enables confident refactoring, adds zero production code.

---

## Problem Statement

The adapter exposes two implementations: SupabasePersistence (production) and InMemoryPersistence (testing). Both claim to implement IPersistence, but there is no verification that they behave identically.

Current state:
- Tests use InMemoryPersistence because it's fast
- Production uses SupabasePersistence
- No guarantee they apply same defaults
- No guarantee they fail on same edge cases
- No guarantee they handle nullability consistently

This creates a failure mode: tests pass (using in-memory), production breaks (using Supabase).

Specific examples observed in codebase:
- memory-persistence.ts line 44: `clerk_id: clerkId` (undefined possible)
- memory-persistence.ts line 65: `end_time: null` vs `undefined` inconsistency
- memory-persistence.ts line 220: `usd_cost: undefined` vs `0` default mismatch

When implementations drift:
- Tests provide false confidence
- Bugs ship to production
- Debugging requires comparing two implementations manually
- No single source of truth for "how persistence should behave"

---

## Why This Problem Exists

**Historical reason:** InMemoryPersistence was added later for testing. It was written to "look similar" to SupabasePersistence, but not verified to behave identically.

**Structural reason:** There is no enforcement mechanism. Both classes implement the same TypeScript interface, but TypeScript only checks types, not behavior.

**Process reason:** When a developer changes one implementation, they don't know they must also change the other. No test catches divergence.

---

## What This Delivers

**Immediate:**
- Catches current inconsistencies (nullability, defaults, error handling)
- Forces both implementations to align
- Documents expected behavior in executable form

**Long-term:**
- Enables confident refactoring (change one, tests verify both still work)
- Prevents regression (if implementations drift, tests fail)
- Acts as specification (new implementations can use same test suite)
- Reduces debugging (contract violations fail in tests, not production)

**For the 4 anti-corruption PRs:**
- PR2 needs this to verify SupabasePersistencePort and InMemoryPersistencePort behave identically
- Without this, PR2 might introduce subtle bugs that only appear in production
- This test suite becomes the acceptance criteria for PR2

---

## Proposed Architectural Structure

```
packages/adapter-supabase/src/__tests__/
├── contract/
│   ├── contract-suite.ts          ← Behavioral specification
│   ├── workflows.contract.test.ts  ← Workflow entity tests
│   ├── invocations.contract.test.ts
│   ├── generations.contract.test.ts
│   └── edge-cases.contract.test.ts
└── implementations/
    ├── supabase.test.ts           ← Run contract against SupabasePersistence
    └── memory.test.ts             ← Run contract against InMemoryPersistence
```

Each contract test defines:
- Preconditions (what must be true before calling method)
- Action (call the method)
- Postconditions (what must be true after)
- Edge cases (what happens when preconditions aren't met)

Both implementations run the exact same tests.

---

## Context

**Current testing approach:**
- Unit tests use InMemoryPersistence for speed
- Integration tests use SupabasePersistence for realism
- No shared test suite between them
- Each implementation has separate tests

**Proposed approach:**
- Define behavioral contract once
- Both implementations must pass contract
- Implementation-specific tests can exist, but contract is required
- Contract failures = implementation is wrong

**Reference pattern:**
This is the "Shared Contract Tests" pattern from Domain-Driven Design. Also known as "Polymorphic Testing" or "Abstract Test Case" pattern.

---

## Checklist

### Phase 1: Define Contract Interface

- [ ] Create `contract/contract-suite.ts` that exports test factory
- [ ] Factory accepts `IPersistence` instance, runs tests against it
- [ ] Define what "correct behavior" means for each method
- [ ] Document preconditions and postconditions

### Phase 2: Test Workflow Entity Lifecycle

- [ ] `ensureWorkflowExists` creates workflow if missing
- [ ] `ensureWorkflowExists` does not error if workflow already exists
- [ ] `createWorkflowVersion` inserts new version
- [ ] `createWorkflowVersion` applies defaults (iteration_budget, time_budget)
- [ ] `createWorkflowVersion` fails if workflow_id doesn't exist
- [ ] `workflowVersionExists` returns true for existing version
- [ ] `workflowVersionExists` returns false for missing version
- [ ] Verify both implementations apply same defaults

### Phase 3: Test Invocation Lifecycle

- [ ] `createWorkflowInvocation` requires wf_invocation_id (never auto-generates)
- [ ] `createWorkflowInvocation` fails if wf_invocation_id is missing
- [ ] `createWorkflowInvocation` fails if wf_version_id doesn't exist
- [ ] `createWorkflowInvocation` applies defaults: status='running', start_time=now, usd_cost=0
- [ ] `updateWorkflowInvocation` updates existing invocation
- [ ] `updateWorkflowInvocation` fails if invocation doesn't exist
- [ ] Verify timestamps are in same format (ISO-8601)
- [ ] Verify both implementations handle end_time as null vs undefined consistently

### Phase 4: Test Nullability Semantics

- [ ] Optional fields: both use `null` (not `undefined`) for "missing"
- [ ] clerk_id: both handle undefined input → null in storage
- [ ] generation_id: both handle undefined → null
- [ ] run_id: both handle undefined → null
- [ ] Verify .getById() returns null (not undefined) when not found

### Phase 5: Test Edge Cases

- [ ] Create invocation with missing wf_version_id → both throw same error type
- [ ] Create invocation without wf_invocation_id → both throw same error type
- [ ] Create version for non-existent workflow → both handle consistently
- [ ] Upsert workflow that already exists → both succeed without error
- [ ] Update invocation that doesn't exist → both throw same error type

### Phase 6: Test Evolution-Specific Methods

- [ ] `evolution.createRun` creates run with status='running'
- [ ] `evolution.createGeneration` requires number and run_id
- [ ] `evolution.completeGeneration` updates generation with stats
- [ ] `evolution.getLastCompletedGeneration` returns most recent
- [ ] Verify both implementations handle generation_id auto-generation

### Phase 7: Run Contract Against Both Implementations

- [ ] Create `implementations/supabase.test.ts` that runs contract
- [ ] Create `implementations/memory.test.ts` that runs contract
- [ ] Both must pass 100% of contract tests
- [ ] Any failure = implementation bug

### Dependencies

- Phase 2 depends on Phase 1 (contract interface must exist)
- Phase 3 depends on Phase 2 (workflows must exist before invocations)
- Phase 4 runs in parallel with Phase 2-3
- Phase 5 depends on Phase 2-3 (edge cases test normal paths)
- Phase 6 depends on Phase 1-2 (evolution builds on workflows)
- Phase 7 depends on all previous phases (runs complete suite)

### Non-Goals

- Do NOT add new persistence methods
- Do NOT refactor implementations to fix failures
- Do NOT add runtime validation
- Do NOT add logging or observability
- Do NOT test Supabase SDK internals
- Do NOT test business logic (only persistence contracts)

### Scope Boundaries

This PR only creates tests. It does not change production code except to fix bugs found by tests.

If tests reveal bugs:
1. Document the bug
2. Fix in both implementations
3. Verify tests now pass

If tests reveal design issues:
1. Document the issue
2. Consider if it blocks the anti-corruption PRs
3. If blocking, fix. If not blocking, defer.

---

## Methods to Test Compliance

**Test structure:**
```typescript
export function createContractSuite(persistence: IPersistence) {
  describe("Workflow Lifecycle Contract", () => {
    it("creates workflow if missing", async () => {
      await persistence.ensureWorkflowExists("wf_123", "Test workflow")
      const exists = await persistence.workflowVersionExists("wf_ver_123")
      expect(exists).toBe(false) // Version doesn't exist yet
    })

    it("applies defaults to workflow version", async () => {
      await persistence.createWorkflowVersion({
        wf_version_id: "wf_ver_123",
        workflow_id: "wf_123",
        dsl: {},
        commit_message: "Initial",
        operation: "init",
      })
      const version = await persistence.loadWorkflowConfig("wf_ver_123")
      expect(version.iteration_budget).toBe(10)
      expect(version.time_budget_seconds).toBe(3600)
    })
  })
}

// Run against Supabase
describe("SupabasePersistence Contract", () => {
  createContractSuite(new SupabasePersistence())
})

// Run against InMemory
describe("InMemoryPersistence Contract", () => {
  createContractSuite(new InMemoryPersistence())
})
```

**Verification method:**
- Run tests: both implementations must pass
- Code coverage: contract suite should cover all public methods
- Failure analysis: if one passes and other fails, that's a bug

---

## Acceptance Criteria

- [ ] Contract test suite exists in `__tests__/contract/`
- [ ] Both SupabasePersistence and InMemoryPersistence run same suite
- [ ] All contract tests pass for both implementations
- [ ] Test coverage >= 90% of IPersistence methods
- [ ] At least 3 edge cases tested per major method
- [ ] Nullability semantics verified (null vs undefined)
- [ ] Default values verified (status, timestamps, usd_cost)
- [ ] Error cases verified (missing IDs, non-existent references)
- [ ] Documentation added explaining contract test pattern

---

## Expected Outcome

After this PR:
- Both implementations provably behave identically
- New implementations can use same test suite
- Regressions caught immediately
- Refactoring has safety net
- Production bugs from implementation drift eliminated

This becomes the foundation that makes the 4 anti-corruption boundary PRs safe to execute.

---

Start by looking into the /docs section and the readme (these can be somewhat outdated, do not rely on them), checking if this plan is not bullshit. Do a thorough check if this hasn't already been implemented somewhere. Start by making a plan. Do not touch any code yet. You must be 100% sure you know the codebase well. Always remember that minimal code is better than 1000s lines of code. Write code like Patrick Collison, and check and verify yourself as if you're Elon Musk but do not mention any of these names anywhere. You must also never mention you are Claude Code. If you find anything strange in the PR idea, you can ask questions.
