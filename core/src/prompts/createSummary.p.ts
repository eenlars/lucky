import { GENERALIZATION_LIMITS } from "@core/prompts/generalizationLimits"
import { truncater } from "@core/utils/common/llmify"

export const CreateSummaryPrompt = {
  summaryPromptText: (content: string): string => {
    return `
<task>
summarize this text data in 1-2 sentences focusing on what information it contains
</task>

<data>
${truncater(content, 1000)}
</data>

<rules>
- information dense and specific
- clear and concise
- easy to understand at a glance
- include example if it helps clarify
- english only
</rules>
    `
  },
  summaryLongPromptText: (content: string, outputLength?: string): string => {
    const missingText = content.length > 2000 ? content.length - 2000 : 0
    const missingTextMessage =
      missingText > 0 ? `${missingText} characters removed for brevity` : ""
    return `
<task>
imagine you are reporting to a human about data. 
the human has 0 context about the data and needs to understand the internals, so you need to be very specific and detailed.
summarize this text data in ${outputLength ? outputLength : "1-2 paragraphs"} focusing on what information it contains.
if anomalies are detected, mention them.
humans would want to know: 
  - numbers of items
  - errors
  - missing fields
  - duplicates
  - malformed values
</task>

<data>
${truncater(content, 2000)}
${missingTextMessage}
</data>

<rules>
- information dense and specific
- clear and concise
- easy to understand at a glance
- include example if it helps clarify
- english only
- do not only mention generic information. this will not help the human understand the data.
</rules>
    `
  },
  summaryPromptTool: (toolNames: string[], rawData: string): string => {
    return `
<task>
summarize what happened in this tool execution - be clear about successes and failures
</task>

<tool_execution>
tool(s) used: ${toolNames.join(", ")}
raw outputs:
${truncater(rawData, 800)}
</tool_execution>

<example_good_summary>
for successful execution:
"searchGoogleMaps successfully returned location data for Albert Heijn stores in Den Bosch, Netherlands. Results include store names, addresses, ratings, opening hours, and contact information."

for failed execution:
"searchGoogleMaps failed with network error ERR_SOCKET_NOT_CONNECTED when trying to search for 'Albert Heijn Den Bosch Netherlands'. No results were returned."

for mixed results:
"executed 3 operations: 2 successful searches returned location data, 1 failed with timeout error"

for limited results:
"searchGoogleMaps returned 6 locations (max_result_count was set to 50). Each location includes complete address and business details."
</example_good_summary>

<rules>
- be specific about what actually happened (success vs failure)
- mention the actual data returned or error encountered
- keep it concise but informative
- if there was an error, mention the error type/message
- english only
${GENERALIZATION_LIMITS}
</rules>
    `
  },
}
