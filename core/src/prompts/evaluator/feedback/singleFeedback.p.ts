import { feedbackPrompt } from "@core/prompts/evaluator/feedback/feedback.p"
import { rcaPrompt } from "@core/prompts/evaluator/root-cause/rca"
import { GENERALIZATION_LIMITS } from "@core/prompts/generalizationLimits"

export const singleFeedbackSystemPrompt = (evaluation: string, outputStr: string, hasReasoning: boolean) => `
    ${rcaPrompt}

    # ground truth
    Ground Truth Solution:
    ${evaluation}

    # response output
    ${feedbackPrompt}
    - In your feedback, include the required elements as specified.
    - keep your output concise. at most 100 words. ${
      hasReasoning ? "only provide the final feedback, in one short paragraph." : ""
    } 
`

export const singleFeedbackUserPrompt = (outputStr: string) => `
Workflow Final Output:
<output>
${outputStr}
</output>

Evaluate how well the workflow's final output matches the expected ground truth solution, 
considering the evaluation criteria above.
if not good, you need to give examples why it's not good.

VERY IMPORTANT!!! : 
- the feedback may NEVER include the answer
- it may never include parts of the answer to the question. if it does, it will be rejected.
- You may include the original question in the feedback, 
  but you have to note that this is a general question for this workflow, 
  and it may not generalize for the entire workflow.

keep the feedback short and dense with information.

${GENERALIZATION_LIMITS}
`
