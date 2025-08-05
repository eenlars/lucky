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
  summaryLongPromptText: (content: string): string => {
    return `
<task>
summarize this text data in 1-2 paragraphs focusing on what information it contains
</task>

<data>
${truncater(content, 2000)}
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
</rules>
    `
  },
}
