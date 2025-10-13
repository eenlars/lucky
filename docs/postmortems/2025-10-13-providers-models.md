# What

We’re trying to let users run workflows (via the Next.js UI or the headless core SDK) against any default provider, including OpenRouter or Groq.  
Today, every model name in a workflow is validated and resolved through a central model catalog (`packages/models`).  
That catalog drives the `ModelsRegistry`, `ModelsFacade`, and ultimately the `ProviderRegistry`, which instantiates AI-SDK providers with per-user API keys pulled from a dual key system (lockbox for UI, environment vars for SDK).

The problem is that global runtime configuration (`@lucky/shared/contracts/config`) hard-codes provider availability flags (`PROVIDER_AVAILABILITY`) and sets `openrouter: false`, `groq: false`.  
Both the core engine (`packages/core/src/models/models-instance.ts`) and the shared models layer (`packages/models/src/models-instance.ts`) read those flags before checking keys.  
If the flag is false, the provider is never added to the config map passed into the AI SDK factory, regardless of whether valid keys exist.

Because `models.provider` in core config (driven by `apps/examples/settings/constants`) can be set to `"openrouter"`, teams believe they’re using OpenRouter by default.  
But tier resolution (`packages/models/src/config/defaults.ts`) still maps low/medium/high to OpenAI models such as `gpt-4o-mini` / `gpt-4o`.  
When the workflow runs, the engine resolves the tier to those OpenAI names, then asks the `ProviderRegistry` for the corresponding provider (determined by catalog entry).  
Since the OpenRouter provider was never initialized (flagged off), two brittle outcomes occur:

1. UI or SDK code tries to load OpenRouter but the provider set lacks an entry.  
   The call to `provider.languageModel(spec.model)` throws **“Provider 'openrouter' not found”**.
2. If the model name lacked a provider prefix (e.g., a tier resolved to `"gpt-4o"`),  
   the catalog still labels it `"openai"`, so it routes to OpenAI even though the user explicitly set their default provider to OpenRouter — a **silent misroute**.

### Hidden Assumptions

- “Catalog provider” equals “runtime provider,” which is only safe if the catalog entry’s provider is actually available.  
- Default provider toggles in examples/configs are assumed to be the single source of truth, yet the lower layer quietly refuses to enable non-OpenAI providers.  
- Model tiers are treated as universal, but today the defaults are OpenAI-only.  
  No guard exists to prevent selecting an OpenAI tier when the runtime provider is OpenRouter.  
- The dual key system assumes the providers map is complete; missing providers are interpreted as “keys not configured,” even though the real root cause is the availability gate.  
- No part of the pipeline double-checks that “provider requested” matches “provider enabled” before workflow validation passes.

---

# Why

We need to explain this to an oracle that cannot see the code, so we must describe the architecture precisely:

- Workflows reference models by API string or tier name.  
- A central catalog maps each API string to a provider (OpenAI, OpenRouter, Groq) with capability metadata and pricing.  
- Core configuration tries to honor the user’s default provider (OpenAI/OpenRouter/Groq).  
- A provider availability map is hard-coded in runtime contracts and is consulted before any provider is instantiated.  
- Even if user-specific keys exist (stored in the lockbox and surfaced to the execution context), the provider is skipped because the availability flag is false.  
- The `ProviderRegistry` instantiates AI SDK providers only for flagged providers.  
  When the workflow asks for a model that maps to a provider that was skipped, instantiation fails.  
- Tiers default to OpenAI models, so the only way to genuinely hit OpenRouter is to use explicit `openrouter/*` or `openai/*` strings — and even then the provider must be enabled.  
- Because validation only checks “model exists in catalog,” not “provider is enabled,” workflow verification passes, but execution fails.

### We Need to Ask the Oracle:

- How do we safely support non-OpenAI providers for both UI and SDK runs without disabling the existing tier logic or key plumbing?  
- What assumptions do we need to break to let provider selection follow runtime config rather than hard-coded availability?  
- Do we need per-provider tier definitions?  
- How should we reconcile catalog provider assignments with user-selected defaults and actual provider enablement?

This wider context helps the oracle tell us whether we’re facing a deeper architectural mismatch (e.g., a central catalog keyed by provider) rather than a simple toggle bug.

---

# Dependents

1. `packages/shared/src/contracts/config` exports `PROVIDER_AVAILABILITY` (source of truth).  
2. `packages/models/src/models-instance` reads those flags and constructs the provider config used by `Models/ProviderRegistry`.  
3. `packages/core/src/models/models-instance` (core workflow engine) repeats the same gating before building the provider map for per-request execution context.  
4. Higher-level APIs (Next.js endpoints, core SDK) call `getModelsInstance()` → `ProviderRegistry` → actual AI SDK provider.  
5. Tier defaults and runtime default provider come from `apps/examples/settings/constants`, which depend on `DEFAULT_MODEL_TIERS`.  
6. Workflow validation (`packages/core/src/utils/validation/workflow`) only checks that model names exist in the catalog; it does not check provider enablement.  
7. Executing nodes (modules under `packages/core/src/node`, `packages/core/src/workflow`) rely on `getLanguageModel`, which eventually hits the `ProviderRegistry`.  
8. Any part of the UI reporting available models/providers (`apps/web/...`) relies on models layer outputs, so they inherit the misconfig.

**In short:**  
Both the UI and SDK invocation pipelines depend on the models/core provider maps, which currently exclude non-OpenAI providers.  
Everything above them assumes providers are available.

---

# Solution Paths

- **Runtime-configurable availability flags** — Replace hard-coded booleans with values derived from CoreConfig or environment variables.  
  *High confidence (~90%)* because it directly removes the blocker while preserving the dual-key plumbing.

- **Provider-aware tier configurations** — Define tier defaults for each provider, keyed by `models.provider`, so “medium” resolves to an OpenRouter model when OpenRouter is selected.  
  *Medium confidence (~70%)*; requires reworking tier definitions but is conceptually straightforward.

- **Provider-and-model aware resolution** — Extend catalog lookup to consider both model name and desired provider to avoid ambiguous matches and ensure routing respects user defaults.  
  *Medium confidence (~60%)*; needs deeper catalog changes.

- **Execution-time enablement guard** — Before workflow validation succeeds, verify that all providers referenced by nodes are actually enabled; otherwise fail fast with an actionable error.  
  *High confidence (~80%)*; enforcement is clear but must hook into validation pipelines.

- **Fallback to per-provider tier overrides** — Allow configuration to specify per-user tier overrides when a provider is unavailable, keeping workflows running
