pseudocode:


we need 2 types of ingestion. one is the sdk and the other the UI. best would be to make the UI stick on top of the SDK.



sdk would probably look like this:

const agentToolInitContext = {
    mcps: [
        {
            mcp: "googleDrive",
            env: {
                KEY: #VALUE,
                KEY2: #VALUE2
            },
            toolsEnabled: ["read_email", "reply_email"],
            toolsInformation: {
                .... this tool is bla bla bla
            }
        }
    ],
    config: {
        strictMode: true,
        validateOnStartup: true,
        throwOnMissingTool: true,
    }
}

const customRegistryMCP = {
    recipes: {
        toolMakePasta,
        toolFindRecipes
    },
}


 If I had to pick one: packages/tools

  Why this package

  - Mixed responsibilities: factory/definition, runtime execution, registry, registration/
    validation, MCP bridge, and domain schemas all live together. This lowers cohesion and
    raises coupling.
      - See re-export sprawl in packages/tools/src/index.ts:1 pulling from factory,
        registry, registration, MCP, and schemas.
  - Global state and side effects: a singleton codeToolRegistry is mutated by registration
    helpers, which complicates tests and parallel runs.
      - Example usage in packages/tools/src/registration/startup.ts:1 and packages/tools/
        src/registry/codeToolsSetup.ts:1.
  - Opaque initialization: setupCodeToolsForNode returns {} during setup without context and
    relies on ensureCodeToolsRegistered order-of-ops, making lifecycle subtle.
      - packages/tools/src/registry/codeToolsSetup.ts:1 shows the “if no context, return
        empty” branch and implicit init.
  - Tight coupling to external layers: imports types from @lucky/shared/contracts/tools
    and ai runtime in the same package that handles registry logic, increasing dependency
    surface.
      - packages/tools/src/index.ts:1 mixes exports from ai, shared contracts, and internal
        registry/factory.
  - Validation and runtime concerns are co-located, which makes unit boundaries fuzzy and
    encourages god-module growth over time.

  Suggested refactor (incremental)

  - Split by responsibility:
      - tool-core: defineTool/toAITool, common schemas, result shaping (pure, no I/O).
      - tool-registry: registry interfaces and an instanceable registry (no global
        singleton).
      - tool-registration: registration and validation utilities (pure, take/return data).
      - tool-adapters/mcp: MCP bridging and client management.
      - tool-schemas: optional light shared schemas/types or move entirely to shared/
        contracts.
  - Remove global singletons: expose a factory to create a registry instance and pass it via
    explicit context/DI.
  - Make initialization explicit: a createToolRegistry({ groups, validators }) that returns
    a ready instance; avoid {} placeholder returns and hidden init calls.
  - Keep dependencies flowing inward: tool-core depends only on shared contracts; adapters
    depend on core/registry, not the other way around.
  - Reduce index re-exports: provide focused, layered entry points (e.g., tool-core, tool-
    registry) to discourage cross-layer usage.

  If you want, I can propose a concrete module split and a minimal code change plan to make
  the registry instance-based without breaking current callers.