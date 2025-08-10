import { getFinalOutputNodeInvocation } from "@core/messages/api/processResponse"
import type {
  DelegationPayload,
  Payload,
  SequentialPayload,
} from "@core/messages/MessagePayload"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import type { WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { CONFIG } from "@runtime/settings/constants"

export type OutgoingHandoffMessage = {
  toNodeId: string
  payload: Payload
}

export type HandoffMessageHandlerOptions = {
  /**
   * Optional override for which targets to send to. If omitted, the handler will
   * derive targets from the node config:
   * - parallel + 2+ non-end handoffs → all handoffs
   * - single handoff → that one
   * - includes only "end" → end
   */
  overrideTargets?: string[]
  /**
   * Optional explicit text to send. If not provided, it is derived from AgentSteps
   * (last actionable output). If still empty, falls back to empty string.
   */
  currentOutputText?: string
  /**
   * Force payload kind ("sequential" or "delegation"). Defaults to coordination type.
   */
  kindOverride?: "sequential" | "delegation"
}

/**
 * Minimal, focused builder for outgoing handoff payloads.
 * Inputs: WorkflowNodeConfig + AgentSteps (+ minimal optional overrides)
 * Output: array of { toNodeId, payload }
 */
export class HandoffMessageHandler {
  private readonly nodeConfig: WorkflowNodeConfig

  constructor(nodeConfig: WorkflowNodeConfig) {
    this.nodeConfig = nodeConfig
  }

  buildMessages(
    agentSteps: AgentSteps | undefined,
    options?: HandoffMessageHandlerOptions
  ): OutgoingHandoffMessage[] {
    const { overrideTargets, currentOutputText, kindOverride } = options ?? {}

    const handOffs: string[] = Array.isArray(this.nodeConfig.handOffs)
      ? this.nodeConfig.handOffs
      : []

    // Determine base prompt from inputs
    const derivedPrompt =
      currentOutputText ??
      (agentSteps ? getFinalOutputNodeInvocation(agentSteps) : null) ??
      ""

    // Determine payload kind
    const defaultKind: "sequential" | "delegation" =
      kindOverride ??
      (CONFIG.coordinationType === "sequential" ? "sequential" : "delegation")

    // Determine targets
    const useParallel =
      this.nodeConfig.handOffType === "parallel" &&
      handOffs.length > 1 &&
      !handOffs.includes("end")

    const targets: string[] =
      overrideTargets ??
      (useParallel ? handOffs : this.selectDefaultTarget(handOffs))

    // If there are no targets, return empty
    if (!targets.length) return []

    // Special-case: ending the workflow emits a "result" payload with workDone
    if (targets.length === 1 && targets[0] === "end") {
      return [
        {
          toNodeId: "end",
          payload: {
            kind: "result",
            berichten: [{ type: "text", text: derivedPrompt }],
          },
        },
      ]
    }

    // Build payloads per target
    const payloads = targets.map((toNodeId) => {
      // For parallel fan-out, add light per-target templating (minimal & compatible)
      const prompt = useParallel
        ? `[Task for ${toNodeId}]: ${derivedPrompt}`
        : derivedPrompt

      const base: DelegationPayload | SequentialPayload =
        defaultKind === "delegation"
          ? {
              kind: "delegation",
              berichten: [
                {
                  type: "text",
                  text: useParallel
                    ? `Branched delegation to ${toNodeId}: ${derivedPrompt}`
                    : "",
                },
              ],
            }
          : {
              kind: "sequential",
              berichten: [
                {
                  type: "text",
                  text: useParallel
                    ? `Branched delegation to ${toNodeId}: ${derivedPrompt}`
                    : "",
                },
              ],
            }

      return { toNodeId, payload: base as Payload }
    })

    return payloads
  }

  /**
   * Minimal default selection for non-parallel cases:
   * - 0 handoffs → []
   * - 1 handoff → [that]
   * - includes only "end" → ["end"]
   * - 2+ (non-parallel) → [] (leave selection to chooser outside this class)
   */
  private selectDefaultTarget(handOffs: string[]): string[] {
    if (handOffs.length === 0) return []
    if (handOffs.length === 1) return [handOffs[0]]
    if (handOffs.length === 1 && handOffs[0] === "end") return ["end"]
    if (handOffs.length > 1 && handOffs.every((h) => h === "end"))
      return ["end"]
    // Multiple non-parallel targets present → selection should be done elsewhere (LLM/logic)
    return []
  }
}
