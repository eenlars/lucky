import type { NodeLog } from "@/core/messages/api/processResponse"
import { sendAI } from "@/core/messages/api/sendAI"
import { MemoryResponseSchema } from "@/core/node/schemas/memorySchema"
import { llmify } from "@/core/utils/common/llmify"
import { lgg } from "@/logger"
import { MODELS } from "@/runtime/settings/constants"
import { isNir } from "../utils/common/isNir"

export const makeLearning = async ({
  toolLogs,
  nodeSystemPrompt,
  currentMemory,
}: {
  toolLogs: string
  nodeSystemPrompt: string
  currentMemory: Record<string, string>
}): Promise<{
  learning: NodeLog<any>
  updatedMemory: Record<string, string>
}> => {
  const date = new Date().toISOString()
  // Ask AI to extract memory updates
  const memoryPrompt = llmify(`
        
Based on this node's execution, update the persistent memory with any durable insights.

Node's instructions: ${nodeSystemPrompt}
Current memory:
${
  currentMemory && Object.keys(currentMemory).length > 0
    ? JSON.stringify(currentMemory, null, 2)
    : "No existing memory"
}
What happened during execution:
${JSON.stringify(toolLogs, null, 2)}

# WHAT TO SAVE
• Only durable, non-obvious *insights* that will improve future workflow runs.
  – Example: user's stable preference for "concise bullet-point answers".
• Insights must be true and non-trivial; omit guesses or hallucinations.

there are different types of memories:
- tool_limitation

# FORMAT
{
  <concise_label>: "<type_of_memory>:<one_sentence_insight>:<usage_count>:<timestamp>:<rating>",  ...
}

example:
{
  "google_scholar": "tool_usage:user used the google scholar tool:7:2025-07-20T12:00:00Z:5",
  "weather_lookup": "tool_limitation:do not use it, it is not accurate:1:2025-07-19T12:00:00Z:-2",
  ...
}

the current date is ${date}

RULES
1. Keys and values are plain english (no arrays, objects, IDs, or JSON blobs, no markdown, no stringified JSON).
2. Keys describe the category of insight.
3. Values contain the insight itself, phrased crisply. if you see that the execution used a memory, you should increment the count of the memory. Also, include and update a usefulness rating in the value: new memories start with rating 0. For existing memories, based on this execution and tool logs, adjust the rating as follows - very useful (significantly improved outcome): +2; somewhat useful (helped a bit): +1; not used: -1; messed up (caused errors or issues): -2. Update the timestamp to current time if the entry is modified.
4. NEVER store:
   - Raw data, PII, full URLs, addresses, phone numbers, reviews, IDs, etc.
   - Temporary, session-specific, or outdated information.
5. You:
   - Add new valid insights if you found any. you group insights if they are similar.
   - Edit or delete any entry that violates these rules. important: if there is something that is not a valid insight, you should delete it.
   - it is possible that this insight can be useful for another time, when we have different inputs.
6. IMPORTANT: Return a key-value OBJECT, not an ARRAY.
7. if you have not found any insights, you should return the existing memory.
8. you cannot store more than 40 memories.
9. the memory is always about future runs, so any data for this run should not be stored.

IF UNSURE
When in doubt, *do not* write new memory, but keep the existing ones if they are valid.

OUTPUT
Return **only** the key-value object—nothing more. Always use the format: { "key1": "value1", "key2": "value2" }

Remember: Only save durable, non-obvious insights that will improve future runs. If there are no new insights, return the existing memory unchanged.`)

  try {
    const memoryResponse = await sendAI({
      model: MODELS.nano,
      messages: [{ role: "user", content: memoryPrompt }],
      mode: "structured",
      schema: MemoryResponseSchema,
    })

    if (memoryResponse.success) {
      const learning = memoryResponse.data
      const noLearning = isNir(learning)
      const learningString = !noLearning
        ? Object.entries(learning)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n")
        : ""
      return {
        learning: {
          type: "learning",
          return: learningString,
        },
        updatedMemory: noLearning ? currentMemory : learning,
      }
    }
    return {
      learning: {
        type: "error",
        return:
          "error when making learning" + JSON.stringify(memoryResponse.error),
      },
      updatedMemory: currentMemory,
    }
  } catch (error) {
    lgg.error("Error making learning", error)
    return {
      learning: {
        type: "error",
        return: "error when making learning" + JSON.stringify(error),
      },
      updatedMemory: currentMemory,
    }
  }
}
