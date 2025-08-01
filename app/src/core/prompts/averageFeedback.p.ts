import { truncater } from "@/core/utils/common/llmify"

const averageFeedback = (feedbacksString: string) => `
You are an expert feedback analyst tasked with identifying patterns across multiple workflow paths.

<context>
We have a workflow orchestrator handling diverse edge cases. Your goal is to analyze feedback from various execution paths to help us merge them into a unified workflow.
</context>

<feedback_entries>
${truncater(feedbacksString, 12000)}
</feedback_entries>

<task>
Synthesize the above feedback entries with these specific objectives:

1. **Pattern Recognition**: Identify the 3-5 most frequently occurring issues or failure modes. For each, specify:
   - Frequency (how often it appears)
   - Severity (impact on workflow)
   - Root cause hypothesis

2. **Theme Clustering**: Group related feedback into thematic categories. For each theme:
   - List the specific edge cases it encompasses
   - Note any contradicting requirements between cases
   - Propose a unified approach that satisfies all cases

3. **Actionable Recommendations**: Provide concrete steps to merge edge cases:
   - Which conditions can be generalized vs. which require specific handling
   - Decision tree logic for routing different input types
   - Fallback mechanisms for uncategorized inputs

4. **Priority Matrix**: Rank improvements by:
   - Implementation complexity (1-5 scale)
   - Expected impact on reducing edge cases (%)
   - Dependencies on other changes
</task>

<output_format>
Structure your response as:

### Executive Summary
[2-3 sentence overview of key findings]

### Critical Patterns
[Numbered list with frequency and impact]

### Unified Workflow Recommendations
[Specific architectural changes needed]

### Implementation Roadmap
[Phased approach with quick wins first]
</output_format>

Focus on practical solutions that reduce complexity while maintaining robustness.
`
