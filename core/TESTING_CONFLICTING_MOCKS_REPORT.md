# Testing Framework Analysis: How Do Modern Frameworks Solve Mock Conflicts?

## The Universal Testing Challenge

Every large JavaScript/TypeScript framework faces the same fundamental problem: **how to mock complex global state without conflicts**. Our 86% → 67% test regression reveals we've fallen into classic anti-patterns that mature frameworks have already solved.

## What Modern Frameworks Do Right

### Jest/Vitest Standard Practices

**1. Mock Factories with Validation**
```typescript
// jest.config.js
export default {
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '@/config': '<rootDir>/src/test/__mocks__/config.ts'
  }
}
```

Most frameworks **avoid vi.mock() sprawl** by centralizing mocks in dedicated directories with **automatic discovery**.

**2. Module Replacement Strategy**
Instead of mocking, they **replace entire modules**:
```typescript
// __mocks__/config.ts - Single source of truth
export const CONFIG = createTestConfig()
export const MODELS = createTestModels()
// Automatically used by all tests
```

**3. Test Environment Isolation**
```typescript
// vitest.config.ts
export default {
  test: {
    environment: 'node',
    setupFiles: ['./src/test/global-setup.ts']
  }
}
```

### Angular's Approach: TestBed Configuration
```typescript
// Angular's solution: Dependency Injection for tests
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      { provide: ConfigService, useValue: mockConfigService },
      { provide: 'RUNTIME_CONFIG', useValue: testConfig }
    ]
  })
})
```

Angular **eliminates global state** by making everything injectable. Tests provide their own versions.

### React Testing Library: Context Providers
```typescript
// React's solution: Context wrapping
const renderWithConfig = (component, config = defaultTestConfig) => {
  return render(
    <ConfigProvider value={config}>
      {component}
    </ConfigProvider>
  )
}
```

React frameworks **wrap components** with test-specific contexts instead of mocking globals.

### Next.js: Environment Variable Strategy
```typescript
// next.config.js test overrides
module.exports = {
  env: {
    CUSTOM_KEY: process.env.NODE_ENV === 'test' ? 'test-value' : 'prod-value'
  }
}
```

Next.js **separates configuration by environment** rather than mocking at runtime.

## Why Our Current Approach Fails Framework Standards

### Anti-Pattern 1: Manual Mock Duplication
**What we do:**
```typescript
// File 1
vi.mock("@runtime/settings/constants", () => ({ CONFIG: { /*200 lines*/ } }))

// File 2  
vi.mock("@runtime/settings/constants", () => ({ CONFIG: { /*different 200 lines*/ } }))
```

**What frameworks do:**
```typescript
// Single __mocks__/runtime-constants.ts used everywhere
export const CONFIG = createStandardTestConfig()
```

### Anti-Pattern 2: Hoisted Mock Conflicts  
**Our problem:**
```typescript
// Same file - second mock REPLACES first!
vi.mock("@runtime/settings/constants", () => ({ CONFIG: { a: 1 } })) // Line 11
vi.mock("@runtime/settings/constants", () => ({ CONFIG: { b: 2 } })) // Line 239 - OVERWRITES!
```

**Framework solution:**
```typescript
// vitest.config.ts - Global mock directory
export default {
  test: {
    alias: {
      '@runtime/settings/constants': './src/__mocks__/runtime-constants.ts'
    }
  }
}
```

### Anti-Pattern 3: Configuration Complexity Without Boundaries
**Our problem:**
```typescript
// Deeply nested config that tests must fully replicate
CONFIG: {
  workflow: { parallelExecution: boolean, asyncExecution: boolean, /*...*/ },
  tools: { inactive: Set<string>, maxToolsPerAgent: number, /*...*/ },
  improvement: { fitness: { /*5 props*/ }, flags: { /*8 props*/ } },
  // ... 50+ total properties across 8 nested objects
}
```

**Framework solution:**
```typescript
// Laravel's approach: Bounded contexts
interface WorkflowConfig { parallelExecution: boolean }
interface ToolsConfig { maxToolsPerAgent: number }
// Tests only mock what they need
```

## How Frameworks Enable Selective Mocking

### Dependency Injection Containers
**Spring Boot pattern:**
```typescript
@TestConfiguration
class TestConfig {
  @Bean @Primary
  configService(): ConfigService {
    return mockConfigService // Only used in tests
  }
}
```

**Benefits for our codebase:**
- Tests inject only needed config sections
- No global state conflicts  
- Easy to reason about dependencies

### Module Boundary Testing
**NestJS approach:**
```typescript
// Test only the genetic programming module
const module = Test.createTestingModule({
  imports: [GeneticProgrammingModule],
  providers: [
    { provide: 'GP_CONFIG', useValue: minimalGpConfig }
  ]
})
```

**What this enables:**
- **Focused testing:** Only mock what the module needs
- **Clear boundaries:** Explicit dependencies
- **Conflict prevention:** Each module has isolated config

## Detailed Analysis: Why Our Tests Need So Much Mocking

### The Global State Problem
Our system has **deep coupling** to global configuration that frameworks actively avoid:

**Current architecture:**
```typescript
// generationRules.ts - Deep in business logic
import { CONFIG } from "@runtime/settings/constants"

function buildWorkflowRules() {
  if (CONFIG.workflow.parallelExecution) { // TIGHTLY COUPLED!
    // business logic depends on global state
  }
}
```

**Framework alternative:**
```typescript
// Dependency injection approach
function buildWorkflowRules(workflowConfig: WorkflowConfig) {
  if (workflowConfig.parallelExecution) { // INJECTED!
    // same logic, testable without globals
  }
}
```

### Configuration Sprawl Analysis
Our CONFIG object spans **8 major domains**:

1. **Workflow execution:** `parallelExecution`, `asyncExecution`, `maxNodes`
2. **Tool management:** `maxToolsPerAgent`, `inactive`, `experimentalMultiStepLoop`  
3. **Model configuration:** `provider`, `inactive` models, fallback strategies
4. **Evolution settings:** `populationSize`, `generations`, `verbose`
5. **Performance limits:** `maxCostUsdPerRun`, `rateWindowMs`, `maxConcurrentWorkflows`
6. **Logging control:** `level`, component `overrides`
7. **Verification rules:** `allowCycles`, `enableOutputValidation`
8. **File paths:** `root`, `logging`, `memory`, `error` directories

**Framework comparison:**
- **Rails:** Separates these into `application.rb`, `database.yml`, `routes.rb`, etc.
- **Spring:** Uses `@ConfigurationProperties` to bind sections to specific classes
- **Next.js:** Splits into `next.config.js`, `.env.local`, `middleware.ts`

### The Dual Constants Architecture
```typescript
// @runtime/settings/constants (server-side)
export const CONFIG = {
  workflow: { parallelExecution: true, asyncExecution: true }, // Full config
  // ... all properties
}

// @runtime/settings/constants.client (browser-safe)  
export const CONFIG = {
  workflow: { parallelExecution: true }, // Subset only
  // ... limited properties
}
```

**Why this creates test problems:**
- Business logic imports from **server constants**
- Some tests import from **client constants**  
- Mock must match the **exact import path** used by code under test
- Developers don't know which import their code will use

## Framework-Inspired Solutions for Our Codebase

### Option 1: Vitest Module Aliases (Immediate Fix)
**What frameworks do:**
```typescript
// vitest.config.ts - Following Next.js/Nuxt patterns
export default {
  test: {
    alias: {
      '@runtime/settings/constants': fileURLToPath(
        new URL('./src/__mocks__/runtime-constants.ts', import.meta.url)
      )
    }
  }
}
```

**Benefits:**
- **Zero test file changes** - automatic mock discovery
- **Single source of truth** - one mock file for all tests
- **Framework standard** - how modern frameworks solve this

### Option 2: Dependency Injection Container (Architecture Fix)
**Following Angular/NestJS patterns:**
```typescript
// config.container.ts
export class ConfigContainer {
  private static instance: ConfigContainer
  private config: RuntimeConfig

  static forTesting(testConfig: Partial<RuntimeConfig>) {
    const container = new ConfigContainer()
    container.config = { ...defaultConfig, ...testConfig }
    return container
  }
}

// Tests become:
const container = ConfigContainer.forTesting({
  workflow: { parallelExecution: false }
})
```

### Option 3: Context-Based Testing (React Pattern)
```typescript
// Following React Testing Library approach
export const ConfigProvider = ({ value, children }) => (
  <ConfigContext.Provider value={value}>
    {children}
  </ConfigContext.Provider>
)

// Tests:
const renderWithConfig = (component, config = testDefaults) => {
  return render(<ConfigProvider value={config}>{component}</ConfigProvider>)
}
```

### Option 4: Environment-Based Configuration (Next.js Style)
```typescript
// config/test.ts - Separate environment configs
export const testConfig = {
  workflow: { parallelExecution: false },
  // ... only test-relevant properties
}

// NODE_ENV=test automatically loads test config
```

## What Frameworks Teach Us About Our Hidden Assumptions

### Framework Principle 1: "Configuration is Environmental, Not Global"
**Framework approach:** Laravel, Rails, Spring Boot all load different configs per environment
**Our assumption:** Global CONFIG object works across all contexts  
**Reality check:** Tests need different config than production
**Lesson:** Separate test configuration from runtime configuration

### Framework Principle 2: "Dependencies Should Be Explicit" 
**Framework approach:** Angular/NestJS inject dependencies, React passes props
**Our assumption:** Functions can access global CONFIG anywhere
**Reality check:** Hidden dependencies make testing impossible
**Lesson:** Make configuration dependencies explicit in function signatures

### Framework Principle 3: "Test Utilities Should Mirror Production Utilities"
**Framework approach:** Django test client mirrors web client, Spring test slices mirror app slices  
**Our assumption:** Tests can mock differently than production loads config
**Reality check:** Mock complexity reveals production config complexity
**Lesson:** If mocking is hard, the production architecture might be wrong

### Framework Principle 4: "Fail Fast with Clear Boundaries"
**Framework approach:** TypeScript strict mode, eslint rules prevent bad patterns
**Our assumption:** Developers will manually avoid mock conflicts
**Reality check:** No automated prevention of duplicate vi.mock() calls
**Lesson:** Tooling should prevent anti-patterns automatically

## Framework-Standard Mock Solutions

### What Jest/Vitest Documentation Recommends
**Official pattern:**
```typescript
// __mocks__/config.js - Automatic discovery
module.exports = {
  CONFIG: require('./test-config.js'),
  MODELS: require('./test-models.js')
}

// Tests automatically use mocks - no vi.mock() needed
```

**Why our coreMocks.ts fails:**
```typescript
// Our current anti-pattern
export function mockRuntimeConstantsForGP() {
  return createMockRuntimeConstants() // Returns object, doesn't mock!
}

// What we should do (framework standard):
// src/__mocks__/@runtime/settings/constants.ts
export const CONFIG = createTestConfig()
export const MODELS = createTestModels()
// Vitest automatically uses this
```

### How Large TypeScript Codebases Handle Testing

**VS Code (Microsoft):**
```typescript
// src/vs/workbench/test/common/editor/editor.test.ts
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';

suite('Editor Tests', () => {
  let configurationService: TestConfigurationService;
  
  setup(() => {
    configurationService = new TestConfigurationService({
      'editor.wordWrap': 'on',
      'workbench.editor.enablePreview': false
    });
  });
});
```
**Pattern:** Dedicated test service classes that implement same interface as production

**TypeORM:**
```typescript
// test/utils/test-utils.ts
export const createTestConnection = (options?: Partial<ConnectionOptions>) => 
  createConnection({
    type: 'sqlite',
    database: ':memory:',
    entities: [__dirname + '/../entity/*.ts'],
    synchronize: true,
    ...options
  });

// Tests use dependency injection
beforeEach(async () => {
  connection = await createTestConnection();
});
```
**Pattern:** Test utilities that create isolated instances per test

**Nx Monorepo (Nrwl):**
```typescript
// packages/devkit/src/generators/testing-utils/app-config.ts
export function createTestingAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    name: 'test-app',
    root: 'apps/test',
    sourceRoot: 'apps/test/src',
    projectType: 'application',
    ...overrides
  };
}
```
**Pattern:** Factory functions that create test configs with sensible defaults + overrides

**Apollo GraphQL:**
```typescript
// src/__tests__/testing-utils.ts
export const createTestServer = (typeDefs: string, resolvers: any) => {
  return new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginInlineTrace()],
    // Test-specific config, not mocking production
  });
};
```
**Pattern:** Test-specific server instances, not mocking global server

**Storybook:**
```typescript
// lib/core-server/src/utils/tests/server-mocks.ts
export const mockOptions = (): Options => ({
  configDir: '.storybook',
  cache: { cache: false },
  outputDir: 'storybook-static',
  // Comprehensive test defaults
});

// Tests import and customize
const options = { ...mockOptions(), port: 9009 };
```
**Pattern:** Comprehensive mock factories with reasonable defaults

**Prisma:**
```typescript
// packages/client/src/__tests__/generation/generator.test.ts
import { DMMFClass } from '../../../runtime/dmmf'

describe('Generator', () => {
  const datamodel = `model User { id String @id }`
  const dmmf = new DMMFClass(await getDMMF({ datamodel }))
  
  // Each test gets fresh isolated DMMF, no global mocking
});
```
**Pattern:** Fresh instances per test, isolated state

**Nest.js Framework:**
```typescript
// packages/core/test/router/router.spec.ts
describe('Router', () => {
  let router: Router;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [Router, { provide: APP_GUARD, useValue: mockGuard }]
    }).compile();
    
    router = module.get<Router>(Router);
  });
});
```
**Pattern:** Test module creation with dependency injection per test

### Common Patterns Across Large TypeScript Codebases

**Pattern 1: Test-Specific Implementations**
- VS Code: `TestConfigurationService` implements `IConfigurationService`
- TypeORM: `createTestConnection()` vs production connection
- Apollo: Test servers vs production servers

**Pattern 2: Factory Functions with Partial Overrides**
```typescript
// Common pattern across codebases
export const createTestConfig = (overrides: Partial<Config> = {}): Config => ({
  // Sensible test defaults
  database: ':memory:',
  port: 0, // random port
  logLevel: 'silent',
  ...overrides // Test-specific customizations
});
```

**Pattern 3: Dependency Injection in Tests**
```typescript
// Not: import { globalConfig } from './config'
// Instead: Inject config as dependency
class ServiceUnderTest {
  constructor(private config: Config) {}
}

// Tests provide their own config
const service = new ServiceUnderTest(testConfig);
```

**Pattern 4: Module-Level Mock Directories**
```
src/
  __mocks__/           <- Jest/Vitest auto-discovers
    fs.js
    database.js
  module-a/
    __mocks__/         <- Module-specific mocks  
      config.ts
    tests/
```

## Why Our Approach Differs (And Fails)

### What Large Codebases DON'T Do
❌ **Global vi.mock() calls scattered across test files**
❌ **Duplicate mock definitions**  
❌ **200-line CONFIG objects copied per test**
❌ **Helper functions that don't actually mock**

### What They DO Instead
✅ **Test-specific service implementations**
✅ **Factory functions with sensible defaults**
✅ **Dependency injection for configuration**
✅ **Isolated instances per test**
✅ **Auto-discovered mock directories**

## Analysis: What Large Codebases Reveal About Our Architecture

### The Configuration Problem is Architectural, Not Testing
Looking at VS Code, TypeORM, Prisma, and NestJS patterns, the issue becomes clear: **our global CONFIG object violates dependency inversion principle**.

**VS Code's approach:**
```typescript
// Production code takes config as dependency
export class EditorService {
  constructor(
    private configurationService: IConfigurationService // ← Injected
  ) {}
  
  private shouldWrap(): boolean {
    return this.configurationService.getValue('editor.wordWrap') === 'on';
  }
}
```

**Our approach:**
```typescript
// Production code depends on global import
import { CONFIG } from '@runtime/settings/constants' // ← Global coupling

export function buildWorkflowRules() {
  if (CONFIG.workflow.parallelExecution) { // ← Hard to test
    // logic
  }
}
```

### Why This Matters for Testing
Large codebases avoid mocking globals because:

1. **Testability:** Functions with injected dependencies are easier to test
2. **Isolation:** Each test can provide its own config without affecting others  
3. **Clarity:** Test setup explicitly shows what the code needs
4. **Maintainability:** No risk of mock conflicts or missing properties

### The 67% → 86% Regression: Framework Lens Analysis

**Root Cause:** We're fighting against TypeScript/Vitest design principles
- **Global imports** make dependency injection impossible
- **vi.mock() hoisting** prevents centralized mock management  
- **Nested configuration** requires complete object replication
- **Dual constants files** create import path confusion

**Framework Insight:** The testing pain points to architectural debt

## Oracle Questions from Large Codebase Perspective

### Immediate Tactical Questions
1. **Should we implement auto-discovered mocks like VS Code?** Create `__mocks__` directory structure?
2. **Can we create test-specific config services?** Following VS Code's `TestConfigurationService` pattern?  
3. **Should we use factory functions like Nx?** `createTestRuntimeConfig(overrides)`?

### Strategic Architecture Questions  
4. **Should we refactor toward dependency injection?** Make config injectable like NestJS?
5. **Can we split the monolithic CONFIG object?** Separate concerns like TypeORM does?
6. **Should we eliminate global configuration entirely?** Follow Prisma's instance-based approach?

### Framework Alignment Questions
7. **Which large codebase pattern best fits our use case?** AI/ML system vs web framework vs database ORM?
8. **How do AI/ML codebases like Hugging Face Transformers handle configuration?** Do they have similar patterns?
9. **Should we adopt a specific framework's testing approach wholesale?** Or create hybrid?

**The Meta Question:** If our codebase was part of VS Code, TypeORM, or NestJS, how would they architect the configuration system to avoid these testing problems entirely?