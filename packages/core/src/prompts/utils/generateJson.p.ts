/**
 * Generates a system message for JSON generation with strict formatting requirements
 * @param jsonSchema - The JSON schema that the response must conform to
 * @returns A system message that instructs the AI to return valid JSON
 */
export const generateJsonPrompt = (jsonSchema: unknown): string => {
  return `You are an AI assistant that strictly returns JSON data. Your response MUST be a single, valid JSON object enclosed in <json> and </json> tags.
Do NOT include any explanatory text, markdown, or any characters outside of the JSON object itself.
Your response must conform to this JSON Schema:
${JSON.stringify(jsonSchema)}

CORRECT EXAMPLE:
input: { 'memory': { 'stores': [] } }
output:
<json>
{
    "memory": {
        "stores": []
    }
}
</json>`
}
