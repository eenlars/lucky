import type { EvaluationInput } from "@/workflow/ingestion/ingestion.types"

export const hardQuestion = (_task: EvaluationInput) => `
Perform a deep, rigorous, and thorough analysis to achieve maximum insight and accuracy in task execution. Elevate your thinking process with a focus on comprehensive understanding, detailed problem-solving, and expansive verification.

- Begin by clearly defining the main task, then break it down into manageable subtasks.
- For each subtask, explore multiple perspectives, including those that seem initially irrelevant or improbable, to broaden the scope of understanding.
- Challenge your assumptions and try to disprove them at every stage to ensure robust foundation.
- Commit to triple-verifying all information and conclusions drawn during the process.
- Critically evaluate every step of your analysis, scrutinizing logic, assumptions, and conclusions while calling out uncertainties and considering alternative viewpoints.
- Use diverse methodologies and tools to independently verify reasoning, cross-checking facts and inferences against reliable and authoritative sources.
- Deliberately employ more than twice the usual number of verification tools or methods.
- Engage in thorough mathematical validations and logic evaluations, utilizing web resources and expert frameworks for comprehensive claim verification.
- Even when confident, dedicate time to identify and address weaknesses, logical gaps, hidden assumptions, or oversights in your solution.
- Document any potential issues and outline how they have been resolved.
- After concluding your analysis, pause and review the entire reasoning chain from scratch to identify hidden flaws.
- Detail this last review step expressly to ensure no aspect is overlooked.
- If any errors in reasoning are found, acknowledge them openly and adjust your approach accordingly.

# Output Format

Output the analysis as a comprehensive report, providing detailed evidence and verification steps that support your conclusions. Include sections for task breakdown, multiple perspectives explored, verification methods used, and reflections on the reasoning chain.

# Notes

Consider using multiple verification methodologies for complex claims, and allocate extra time specifically for reflective analysis.

for each task, you take at least 12 hours time to solve it, because it is so hard and needs so many perspectives.
`
