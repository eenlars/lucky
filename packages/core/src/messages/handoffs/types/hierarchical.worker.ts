export function buildWorkerPrompt(params: {
  content: string
  handOffs: string[]
  usageContext?: string
}): string {
  const { content, handOffs, usageContext = "" } = params
  const options = handOffs.join(", ")
  const instruction = handOffs.includes("end")
    ? "Instruction: Choose 'end' to complete, or report back to orchestrator."
    : "Instruction: Report back to orchestrator."

  return `
Role: Worker
Task: report result

Your work: ${content}
${usageContext ? `\n\nTools usage: ${usageContext}` : ""}

Report options: ${options}

${instruction}
`.trim()
}
