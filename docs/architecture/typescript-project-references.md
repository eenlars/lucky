# TypeScript Project References - Known Limitation

## Current State

This monorepo does **not** use TypeScript Project References, despite being a monorepo with package dependencies. This is a deliberate decision due to technical constraints.

## Why Not Project References?

TypeScript Project References with `composite: true` are incompatible with tsup's DTS (declaration file) generation:

1. **Composite projects require explicit file lists** - All files must be in the `include` pattern or explicitly listed
2. **tsup DTS follows imports transitively** - It automatically discovers files through import chains
3. **This creates a mismatch** - tsup's DTS builder fails when it encounters imports outside the composite project's file list

### Affected Packages

- `packages/shared` - Uses tsup with `dts: { resolve: true }`
- `packages/models` - Uses tsup with `dts: { resolve: true }`

Both packages would need `composite: true` to participate in project references, but this breaks their build process.

## Current Build Performance

The monorepo uses alternative optimization strategies:

1. **Turbo build orchestration** - Handles dependency ordering via `dependsOn: ["^build"]`
2. **tsup bundler caching** - Each package has its own incremental build
3. **TypeScript incremental compilation** - Via `tsBuildInfoFile` in each tsconfig

## The Problem (Future Scale)

As described in the codebase analysis, at current scale this is tolerable, but in 5 years with 10 developers:

- CI takes 15+ minutes instead of 2
- Local development requires full `bun run build` before tests
- Incremental builds don't work across package boundaries
- Changing `@lucky/shared` rebuilds everything downstream

## Solutions for the Future

When this becomes a real bottleneck, choose one:

### Option 1: Replace tsup with tsc (Recommended)

```bash
# For packages that need project references
# Replace tsup with tsc --build
```

**Pros:**
- Native TypeScript project references support
- True incremental compilation across packages
- Predictable, standards-based build

**Cons:**
- Lose tsup's bundling features (code splitting, minification)
- More complex build configuration

### Option 2: Use Nx or similar

Nx has better incremental build support for tsup-based workflows:

```bash
# Nx can cache tsup outputs more intelligently
nx run-many --target=build
```

**Pros:**
- Keep tsup
- Better caching and task orchestration
- Distributed task execution support

**Cons:**
- Additional tooling complexity
- Migration effort

### Option 3: Hybrid approach

Use tsc for declaration generation, tsup for bundling:

```json
{
  "scripts": {
    "build:types": "tsc --build",
    "build:js": "tsup --dts false",
    "build": "npm run build:types && npm run build:js"
  }
}
```

## Testing Project References

To verify this limitation, try enabling composite mode:

```bash
# This WILL fail
git checkout -b test-composite
# Add "composite": true to packages/shared/tsconfig.build.json
bun run build
# Error: TS6307 - File not listed within file list of project
```

## References

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [tsup Issue #580](https://github.com/egoist/tsup/issues/580) - Composite mode compatibility
- [Turbo Handbook - Incremental Builds](https://turbo.build/repo/docs/handbook)
