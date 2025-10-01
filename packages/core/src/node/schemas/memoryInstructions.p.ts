export const memoryInstructions = `
WHAT TO SAVE
• Only durable, non-obvious *insights* that will improve future workflow runs.
  – Example: user's stable preference for "concise bullet-point answers".
• Insights must be true and non-trivial; omit guesses or hallucinations.

FORMAT
{
  <concise_label>: "<one-sentence insight>",
  ...
}

RULES
1. Keys and values are plain strings (no arrays, objects, IDs, or JSON blobs).
2. Keys describe the category of insight (e.g., "user_preference", "last_topic").
3. Values contain the insight itself, phrased crisply.
4. NEVER store:
   • Raw data, PII, full URLs, addresses, phone numbers, reviews, IDs, etc.
   • Obvious facts easily re-derived from context.
   • Temporary, session-specific, or outdated information.
5. After every run:
   • Add new valid insights if you found any.
   • Edit or delete any entry that violates these rules.
6. IMPORTANT: Return a key-value OBJECT, not an ARRAY.

IF UNSURE
When in doubt, *do not* write new memory, but keep the existing ones if they are valid.

OUTPUT
Return **only** the key-value object—nothing more. Always use the format: { "key1": "value1", "key2": "value2" }
`
