# Manual Testing Checklist for ModelName Migration

## Quick 5-Minute Test

### Test 1: Verify App Starts and Renders Model Selector
**What we're testing:** Client-utils functions work in the React UI

```bash
cd app
bun run dev
```

1. Open browser to `http://localhost:3000`
2. Navigate to any workflow editor or node details page
3. **LOOK FOR:** Model dropdown/selector should populate with models
4. **EXPECTED:** You should see models like:
   - `google/gemini-2.5-flash-lite`
   - `openai/gpt-4.1-mini`
   - `openai/gpt-4.1-nano`
   - etc.

**✅ PASS if:** Dropdown shows 10+ models
**❌ FAIL if:** Dropdown is empty or shows error

---

### Test 2: Verify Core Can Load Code Tools
**What we're testing:** @runtime alias points to examples/

```bash
cd core
bun run -e "
import { CodeToolAutoDiscovery } from './src/tools/code/AutoDiscovery.ts';
const discovery = new CodeToolAutoDiscovery();
const tools = await discovery.discoverAll();
console.log('✅ Discovered', tools.length, 'code tools');
console.log('Sample tools:', tools.slice(0, 5).map(t => t.name));
"
```

**✅ PASS if:** Shows "Discovered 20+ code tools"
**❌ FAIL if:** Error about missing paths or modules

---

### Test 3: Verify Model Validation Works
**What we're testing:** Runtime validation catches bad models

```bash
cd core
bun run -e "
import { validateAndResolveModel } from './src/messages/api/sendAI/validateModel.ts';

// Test 1: Valid model should pass
try {
  const valid = validateAndResolveModel('openai/gpt-4.1-mini', 'openai/gpt-4.1-mini');
  console.log('✅ Test 1 PASS: Valid model accepted:', valid);
} catch (e) {
  console.log('❌ Test 1 FAIL:', e.message);
}

// Test 2: Invalid model should throw
try {
  const invalid = validateAndResolveModel('fake/bad-model', 'fake/bad-model');
  console.log('❌ Test 2 FAIL: Invalid model was accepted (should have thrown)');
} catch (e) {
  console.log('✅ Test 2 PASS: Invalid model rejected:', e.message);
}
"
```

**✅ PASS if:** Test 1 accepts valid model, Test 2 rejects invalid model
**❌ FAIL if:** Either test fails

---

### Test 4: Run Type Tests
**What we're testing:** Type system is solid

```bash
cd core
bun test src/utils/spending/__tests__/modelName.types.test.ts
```

**✅ PASS if:** All 23 tests pass
**❌ FAIL if:** Any test fails

---

### Test 5: Run Unit Tests
**What we're testing:** Nothing broke in production code

```bash
cd core
bun run test:unit
```

**✅ PASS if:** 580+ tests pass (96%+ pass rate)
**❌ FAIL if:** Pass rate drops below 95% or critical tests fail

---

## Full Integration Test (Optional - 15 minutes)

### Test 6: Create and Run a Simple Workflow

```bash
cd core
bun run -e "
import { Workflow } from './src/workflow/Workflow.ts';
import { getDefaultModels } from './src/core-config/compat.ts';

const config = {
  entryNodeId: 'node1',
  nodes: [{
    nodeId: 'node1',
    description: 'Test node',
    systemPrompt: 'You are a helpful assistant. Answer: What is 2+2?',
    modelName: getDefaultModels().default,
    mcpTools: [],
    codeTools: [],
    handOffs: [],
    handoffType: 'final-output',
    memory: {}
  }]
};

const wf = Workflow.create({
  config,
  evaluationInput: {
    type: 'text',
    question: 'What is 2+2?',
    answer: '4',
    goal: 'Test workflow',
    workflowId: 'test-wf'
  },
  workflowVersionId: 'test-v1'
});

console.log('✅ Workflow created with model:', getDefaultModels().default);
console.log('If this printed without errors, the migration works end-to-end!');
"
```

**✅ PASS if:** No errors, workflow created successfully
**❌ FAIL if:** Errors about models, imports, or paths

---

## What To Look For

### ✅ Good Signs
- Model dropdowns populate
- Console shows no errors
- Tests pass
- Code tools discovered
- Workflow creates successfully

### ❌ Bad Signs
- Empty dropdowns
- "Cannot find module @runtime" (should resolve to examples/)
- "Model not found" errors
- Failed type validations
- Test failures

---

## Quick Smoke Test (30 seconds)

If you're really short on time:

```bash
# In one terminal
cd app && bun run dev

# In another terminal
cd core && bun run test:unit | grep "Tests"
```

**✅ PASS if:**
- App starts without errors
- Tests show 580+ passing

---

## Expected Results Summary

| Test | Expected | Time |
|------|----------|------|
| App renders models | 10-13 models in dropdown | 2 min |
| Code tools discovery | 20+ tools found | 10 sec |
| Model validation | Valid accepted, invalid rejected | 10 sec |
| Type tests | 23/23 pass | 30 sec |
| Unit tests | 580+ pass (96%+) | 2 min |
| Workflow creation | No errors | 30 sec |

**Total Time: ~5 minutes for essential tests**

---

## If Something Fails

1. **Empty model dropdown**
   - Check browser console for errors
   - Verify `app/src/lib/models/client-utils.ts` imports

2. **Cannot find @runtime module**
   - Check `core/tsconfig.json` has `"@runtime/*": ["../examples/*"]` (for backward compatibility)
   - Check `examples/` folder exists and contains settings/

3. **Model validation fails**
   - Check `examples/settings/models.ts` exists
   - Verify `MODEL_CONFIG.provider` is set

4. **Type tests fail**
   - Run `bun run tsc --noEmit` to see type errors
   - Check for import issues

---

## Success Criteria

✅ **All systems GO if:**
- App starts and shows models in UI
- Unit tests pass at 96%+ rate
- Type tests pass 100%
- No console errors in browser or terminal

This confirms the ModelName migration is solid and production-ready.