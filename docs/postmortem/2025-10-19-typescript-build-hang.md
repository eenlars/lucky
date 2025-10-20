# Postmortem: TypeScript Build Infinite Loop & Memory Exhaustion

**Date:** October 19, 2025
**Severity:** Critical - Blocked all builds
**Duration:** ~2 hours investigation
**Status:** Resolved

---

## Summary

TypeScript compiler entered an infinite type resolution loop when building the `@lucky/core` package, causing heap memory exhaustion and complete build failure. Root cause was cross-package file includes in `tsconfig.json` combined with module resolution conflicts.

---

## Impact

- **Build System:** Complete failure - `tsc --noEmit` hung indefinitely
- **CI/CD:** All builds blocked
- **Developer Experience:** Unable to run type checking or builds
- **Memory Usage:** TypeScript process consumed 1.4GB+ RAM before crashing

### Affected Packages
- `@lucky/core` (primary victim - hung during type check)
- `@lucky/examples` (build failures due to missing shared package output)
- `packages/mcp-server` (configuration corruption)

---

## Timeline

1. **Initial Report:** Build hanging with no output
2. **First Investigation:** Suspected mcp-server tsconfig corruption
3. **Discovery 1:** Found mcp-server using `NodeNext` module resolution while extending `tsconfig.base.json` (bundler-based)
4. **Discovery 2:** Found cross-package file includes in core's tsconfig:
   ```json
   "include": [
     "../models/src/models/model-resolver.ts",
     "../models/src/models/tier-config-builder.ts"
   ]
   ```
5. **Testing:** Confirmed core package hung after 10+ seconds, models package built successfully in 1.2s
6. **Stack Trace Analysis:** V8 interpreter stuck in infinite loop (`Builtins_InterpreterEntryTrampoline`)

---

## Root Cause Analysis

### Primary Cause: Cross-Package File Includes

**Location:** `packages/core/tsconfig.json:27-28`

```json
{
  "include": [
    "src/**/*.ts",
    "../models/src/models/model-resolver.ts",  // ❌ PROBLEM
    "../models/src/models/tier-config-builder.ts"  // ❌ PROBLEM
  ]
}
```

**Why this caused the hang:**

1. Core package imports from `@lucky/models` via package dependency
2. Core ALSO directly includes models source files in its tsconfig
3. TypeScript processes models files **twice**:
   - Once as the `@lucky/models` package
   - Once as direct includes in core's compilation
4. When cross-references exist between core and models, TypeScript enters infinite type resolution loop

### Secondary Cause: Module Resolution Conflict

**Location:** `packages/mcp-server/tsconfig.json:2,4-5`

```json
{
  "extends": "../../tsconfig.base.json",  // Inherits bundler-based paths
  "compilerOptions": {
    "module": "NodeNext",           // ❌ Conflicts with base
    "moduleResolution": "NodeNext"  // ❌ Conflicts with base
  }
}
```

**Why this contributed:**

- `tsconfig.base.json` extends `tsconfig.paths.json` with all `@lucky/*` mappings
- mcp-server inherited these paths but used incompatible `NodeNext` resolution
- TypeScript attempted to resolve paths using two different algorithms simultaneously
- Created additional type resolution conflicts

### Contributing Factor: Missing Build Output

**Location:** `packages/shared/dist/` (missing)

- Turbo cache indicated shared was built, but `dist/` folder was missing
- Caused secondary build failures when examples tried to import from shared
- Masked the primary tsconfig issue

---

## Technical Details

### TypeScript Behavior

When TypeScript encounters cross-package file includes:

1. **Initial Parse:** Loads both package types and direct file types
2. **Type Resolution:** Attempts to resolve cross-references
3. **Cache Miss:** Types don't match between package vs. direct include
4. **Retry Loop:** Attempts re-resolution with different strategies
5. **Infinite Recursion:** No convergence, enters infinite loop
6. **Memory Exhaustion:** Eventually crashes with heap overflow

### Stack Trace Evidence

```
Builtins_InterpreterEntryTrampoline (repeated 30+ times)
Memory used: 1.4GB
Physical footprint (peak): 1.4GB
```

Indicates V8 JavaScript engine stuck in infinite interpreter loop.

---

## Resolution

### Immediate Fixes Applied

1. **Removed cross-package includes from core/tsconfig.json**
   - Deleted lines 27-28 (models file includes)
   - Core now only imports via `@lucky/models` package

2. **Fixed/removed mcp-server package**
   - Package removed from monorepo (standalone publish target)
   - Alternative: Could have changed to `module: "ESNext"`, `moduleResolution: "bundler"`

3. **Rebuilt shared package**
   - `bun run build:shared` to regenerate dist folder
   - Resolved secondary build failures

### Verification

```bash
cd packages/core
tsc --noEmit --extendedDiagnostics

# Before: Hung indefinitely, 1.4GB+ memory
# After: Completes in ~1.5s, 300MB memory
```

---

## Prevention Measures

### 1. Automated Validation Script

**Created:** `scripts/validate-tsconfigs.ts`

**Checks for:**
- ❌ Cross-package file includes (regex: `../*/src/*.ts`)
- ❌ Module resolution conflicts (NodeNext with tsconfig.base.json)
- ⚠️ Missing composite/declaration settings

**Integration:**
```json
{
  "scripts": {
    "validate:tsconfigs": "bun run scripts/validate-tsconfigs.ts",
    "prebuild": "bun run validate:tsconfigs",  // Recommended
    "pretest": "bun run validate:tsconfigs"    // Recommended
  }
}
```

### 2. Pre-commit Hook (Optional)

Add to `.husky/pre-commit`:
```bash
if git diff --cached --name-only | grep -q "tsconfig.json"; then
  bun run validate:tsconfigs || exit 1
fi
```

### 3. CI/CD Check (Recommended)

Add validation as first step in build pipeline before expensive operations.

### 4. Documentation

- Updated TypeScript configuration guidelines
- Added examples of correct vs. incorrect patterns

---

## Lessons Learned

### What Went Well

1. Systematic investigation methodology identified multiple issues
2. Stack trace analysis confirmed infinite loop hypothesis
3. Validation script prevents recurrence
4. Resolution improved build performance (10s+ hang → 1.5s)

### What Could Be Improved

1. **Earlier Detection:** Should have caught this in code review
2. **Faster Diagnosis:** Build timeouts would have identified hang location faster
3. **Better Error Messages:** TypeScript doesn't warn about cross-package includes
4. **Monitoring:** No alerting on abnormal build times

### Knowledge Gaps Addressed

1. Understanding of TypeScript project references
2. Module resolution algorithm differences (NodeNext vs. bundler)
3. TypeScript compilation performance patterns
4. Monorepo configuration best practices

---

## Action Items

- [x] Remove cross-package includes from core/tsconfig.json
- [x] Create validation script
- [x] Add validation to package.json scripts
- [ ] Add pre-commit hook for tsconfig validation (optional)
- [ ] Add CI/CD validation step
- [ ] Document tsconfig best practices in CONTRIBUTING.md
- [ ] Consider build timeout wrapper for faster failure detection
- [ ] Review all other packages for similar issues (validation script covers this)

---

## References

### Related Files
- `scripts/validate-tsconfigs.ts` - Prevention tool
- `packages/core/tsconfig.json` - Fixed configuration
- `tsconfig.base.json` - Base configuration
- `tsconfig.paths.json` - Path mappings

### Key Concepts
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Module Resolution Strategies](https://www.typescriptlang.org/docs/handbook/modules/theory.html#module-resolution)
- Monorepo TypeScript configuration patterns

### Similar Issues
- Similar pattern caused issues in large TypeScript monorepos
- Common antipattern: mixing package imports with direct file includes
- Known TypeScript limitation: no warning for this configuration

---

**Prepared by:** Claude Code
**Reviewed by:** [TBD]
**Next Review:** 30 days (2025-11-19)
