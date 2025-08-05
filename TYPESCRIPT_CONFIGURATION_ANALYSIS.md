# TypeScript Configuration Crisis: Cross-Package Import Resolution

## The Oracle's Question

Oh Oracle of TypeScript Configuration, I come seeking wisdom about a monorepo structure that has descended into import chaos. I shall lay bare the full context of this architectural puzzle, for only with complete understanding can you guide me to resolution.

## The Monorepo Architecture

### Directory Structure
```
together/
├── tsconfig.base.json                    # Root configuration
├── packages/
│   └── core/                            # Core package (the troubled one)
│       ├── tsconfig.json                # Extends base, has its own paths
│       ├── src/                         # Source code directory
│       │   └── tools/code/CodeToolRegistry.ts  # File trying to import
│       └── env.mjs                      # Environment configuration
└── example/                             # Example/demo package
    ├── tsconfig.json                    # Extends base, different paths
    └── code_tools/
        └── registry.ts                  # File being imported
```

## The Core Problem Statement

**The Symptom**: The file `/packages/core/src/tools/code/CodeToolRegistry.ts` attempts to import from `@example/code_tools/registry`, but TypeScript throws two errors:

1. `File '/example/code_tools/registry.ts' is not under 'rootDir' '/packages/core'`
2. `File is not listed within the file list of project '/packages/core/tsconfig.json'`

**The Import**: `const { ALL_TOOLS } = await import("@example/code_tools/registry")`

## Configuration Analysis

### Root Configuration (`tsconfig.base.json`)
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "esnext", 
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@core/*": ["packages/core/src/*"],
      "@example/*": ["example/*"]
    }
  }
}
```

### Core Package Configuration (`packages/core/tsconfig.json`)
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "lib",
    "baseUrl": ".",
    "paths": {
      "@types/*": ["./src/types/*"],
      "@logger": ["./src/utils/logging/Logger.ts"],
      // ... many internal paths ...
      "@utils/*": ["./src/utils/*"],
      "@env": ["./env.mjs"],
      "@/*": ["./src/*"],
      "@example/*": ["../../example/*"]  // Recently added
    }
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx", 
    "src/**/*.js",
    "src/**/*.json",
    "src/**/*.mjs",
    "env.mjs"
  ],
  "exclude": ["node_modules"]
}
```

### Example Package Configuration (`example/tsconfig.json`)
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@settings/*": ["./settings/*"],
      "@schemas/*": ["./schemas/*"],
      "@core/*": ["../packages/core/src/*"]
    }
  },
  "include": ["./**/*.ts", "./**/*.tsx", "./**/*.js"],
  "exclude": ["node_modules"],
  "references": [{ "path": "../packages/core" }]
}
```

## The Philosophical Questions for the Oracle

### 1. Project Boundaries vs Path Mapping
Oh Oracle, when a TypeScript project with `composite: true` tries to import from outside its `rootDir`, does the path mapping in `tsconfig.json` override the project boundary rules? Or do project boundaries always take precedence?

### 2. File Inclusion vs Path Resolution  
When `@example/*` resolves to `../../example/*` but the target files are not in the `include` array of the importing project, which TypeScript rule wins? Does path mapping require explicit file inclusion?

### 3. Composite Project References
The example package has `"references": [{ "path": "../packages/core" }]`, but core doesn't reference example back. In a composite project setup, should cross-package imports always be bidirectional references? Or can path mapping handle unidirectional dependencies?

### 4. Module Resolution Strategy
With `"moduleResolution": "bundler"` and `"composite": true`, do these create conflicting expectations about how imports should be resolved? Does bundler resolution expect looser project boundaries?

### 5. Dynamic vs Static Imports
The import is dynamic: `await import("@example/code_tools/registry")`. Does TypeScript treat dynamic imports differently regarding project boundaries? Should dynamic imports bypass `rootDir` restrictions?

## Current Workaround Analysis

I created a bridge file `externalRegistry.ts` that uses relative path imports:
```typescript
const registryPath = "../../../../../../example/code_tools/registry"
const { ALL_TOOLS } = await import(registryPath)
```

This works but feels architecturally wrong - it bypasses the type system's path mapping entirely.

## The Oracle's Dilemma

What is the "correct" TypeScript way to handle this architectural pattern where:
- A core package needs to dynamically load tools from an example/demo package
- Both packages should maintain their project boundaries
- Path mappings should provide clean import syntax
- The system should work in both development and compiled scenarios

Should I:
1. Accept that composite projects cannot cross-import and restructure the architecture?
2. Make the core package include the example directory in its file list?
3. Use project references bidirectionally?
4. Abandon path mappings for cross-package imports?
5. Move the registry into the core package itself?

## The Ultimate Question

Oh Oracle, given this TypeScript configuration constellation, what is the architecturally sound, maintainable, and TypeScript-compliant way to resolve cross-package imports while preserving project boundaries and type safety?

What fundamental TypeScript principle am I violating, and how should this monorepo be properly structured to avoid these import resolution conflicts?