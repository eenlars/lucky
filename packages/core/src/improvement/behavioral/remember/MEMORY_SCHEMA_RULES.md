# Memory Schema Rules

## Prevention Strategy

To prevent the "memory Required" error that occurred in `makeLearning.ts`, follow these rules:

### 1. Always Import from Centralized Schema

**DO:** Import memory schemas from the centralized location

```typescript
import {
  MemoryResponseSchema,
  MemorySchemaOptional,
} from "@/core/node/schemas/memorySchema"
```

**DON'T:** Create new memory schemas inline

```typescript
// ❌ This can cause inconsistencies
const myMemorySchema = z.object({
  memory: z.record(z.string(), z.string()),
})

// ❌ This doesn't match what AI naturally returns
const wrappedSchema = z.object({
  memory: z.record(z.string(), z.string()),
})
```

### 2. Use the Right Schema for the Right Purpose

- **`MemoryResponseSchema`**: For AI responses that return memory directly as `{"key": "value"}`
- **`MemorySchemaOptional`**: For node configurations that can have memory (nullable)
- **`MemorySchema`**: For required memory objects

### 3. AI Response Pattern

AI naturally returns memory like this:

```json
{
  "physical_stores": "common_sense:some companies have physical store locations:1"
}
```

NOT like this:

```json
{
  "memory": {
    "physical_stores": "common_sense:some companies have physical store locations:1"
  }
}
```

### 4. Schema Validation

Always use the centralized validation functions:

- `validateMemory()` - validates required memory
- `validateMemoryOptional()` - validates optional memory
- `sanitizeNodeMemory()` - sanitizes invalid entries

### 5. Type Safety

Use the exported types:

```typescript
import type {
  Memory,
  MemoryOptional,
  MemoryResponse,
} from "@/core/node/schemas/memorySchema"
```

## Error Prevention Checklist

Before creating any memory-related schema:

- [ ] Is there already a schema in `memorySchema.ts`?
- [ ] Does the AI response format match the schema expectation?
- [ ] Are you importing from the centralized schema file?
- [ ] Are you using the right schema type for the use case?

## Testing

Run tests to ensure memory schemas work correctly:

```bash
bun run test src/core/node/schemas/__tests__/memorySchema.test.ts
```
