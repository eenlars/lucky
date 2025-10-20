import "dotenv/config"
import pTimeout from "p-timeout"
import { beforeAll, describe, expect, it } from "vitest"

import { initCoreConfig } from "@lucky/core/core-config/coreConfig"
import { sendAI } from "@lucky/core/messages/api/sendAI/sendAI"
import { formalizeWorkflow } from "@lucky/core/workflow/actions/generate/formalizeWorkflow"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { CONFIG, MODELS, PATHS } from "@lucky/examples/settings/constants"
import { findModel } from "@lucky/models"
import { z } from "zod"

function initCoreOnce() {
  initCoreConfig({
    paths: PATHS,
    models: {
      gateway: CONFIG.models.gateway,
      defaults: MODELS,
      inactive: CONFIG.models.inactive,
    },
    coordinationType: CONFIG.coordinationType,
    newNodeProbability: CONFIG.newNodeProbability,
    logging: CONFIG.logging,
    workflow: CONFIG.workflow,
    tools: CONFIG.tools,
    improvement: CONFIG.improvement,
    verification: CONFIG.verification,
    evolution: CONFIG.evolution,
    limits: CONFIG.limits,
    persistence: {
      useMockBackend: process.env.USE_MOCK_PERSISTENCE === "true",
      defaultBackend: process.env.USE_MOCK_PERSISTENCE === "true" ? "memory" : "supabase",
    },
  })
}

describe("AI pipeline smoke (isolation)", () => {
  beforeAll(() => {
    initCoreOnce()
  })

  it("execText returns promptly", async () => {
    const result = await pTimeout(
      sendAI({
        mode: "text",
        messages: [{ role: "user", content: "Reply with OK only" }],
        retries: 0,
      }),
      { milliseconds: 60_000, message: new Error("execText timeout") },
    )
    // We only assert that we got a response without hanging
    expect(result).toBeDefined()
  })

  it("genObject path returns promptly", async () => {
    const schema = z.object({ answer: z.string() })
    const { genObject } = await import("@lucky/core/messages/api/genObject")
    const result = await pTimeout(
      genObject({
        messages: [{ role: "user", content: 'Return { "answer": "OK" }' }],
        schema,
        opts: { retries: 0, repair: true },
      }),
      { milliseconds: 60_000, message: new Error("genObject timeout") },
    )
    expect(result).toBeDefined()
  })

  it.skip("formalizeWorkflow returns normalized models", async () => {
    const base: WorkflowConfig = {
      nodes: [
        {
          nodeId: "main",
          description: "Main workflow node",
          systemPrompt: "You are a helpful assistant. Complete the task as requested.",
          gatewayModelId: "gpt-4.1-mini",
          mcpTools: [],
          codeTools: [],
          gateway: "openai-api",
          handOffs: ["end"],
          memory: {},
        },
      ],
      entryNodeId: "main",
      ui: {
        layout: {
          nodes: [
            { nodeId: "start", x: 0, y: 0 },
            { nodeId: "end", x: 200, y: 0 },
            { nodeId: "main", x: 100, y: 0 },
          ],
        },
      },
    }

    const result = await pTimeout(
      formalizeWorkflow("make another node", {
        workflowConfig: base,
        workflowGoal: "make another node",
        verifyWorkflow: "none",
      } as any),
      { milliseconds: 120_000, message: new Error("formalize timeout") },
    )
    expect(result).toBeDefined()
    if (!result?.success || !result.data) {
      throw new Error(`formalizeWorkflow failed: ${result?.error}`)
    }

    const normalizedModels = result.data.nodes.map(node => node.gatewayModelId)
    for (const model of normalizedModels) {
      expect(findModel(model)).toBeTruthy()
      expect(model).toMatch(/^[^#]+#[^#]+$/)
    }
  })
})
