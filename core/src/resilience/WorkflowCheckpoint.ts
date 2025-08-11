import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import type { InvocationSummary } from "@core/messages/summaries"
import type { Json } from "@core/utils/clients/supabase/types"
import { writeJsonAtomic } from "@core/utils/common/files"
import { lgg } from "@core/utils/logging/Logger"
import type { Workflow } from "@core/workflow/Workflow"
import { PATHS } from "@runtime/settings/constants"
import { existsSync } from "fs"
import { mkdir, readFile } from "fs/promises"
import { join } from "path"

export interface CheckpointData {
  workflowVersionId: string
  workflowInvocationId: string
  timestamp: number
  messageQueue: WorkflowMessage[]
  completedNodes: Set<string>
  nodeInvocations: number
  agentSteps: AgentSteps
  summaries: InvocationSummary[]
  totalCost: number
  lastNodeOutput: string
  waitingMessages: Map<string, WorkflowMessage[]>
  nodeMemoryUpdates: Map<string, Record<string, string>>
  metadata?: Record<string, any>
}

export interface CheckpointOptions {
  autoCheckpointInterval?: number
  maxCheckpoints?: number
  checkpointPath?: string
}

export class WorkflowCheckpoint {
  private readonly checkpointDir: string
  private readonly options: Required<CheckpointOptions>
  private autoCheckpointTimer?: NodeJS.Timeout

  constructor(
    private workflowInvocationId: string,
    options: CheckpointOptions = {}
  ) {
    this.options = {
      autoCheckpointInterval: options.autoCheckpointInterval ?? 60000, // 1 minute
      maxCheckpoints: options.maxCheckpoints ?? 5,
      checkpointPath:
        options.checkpointPath ?? join(PATHS.node.logging, "checkpoints"),
    }

    this.checkpointDir = join(
      this.options.checkpointPath,
      this.workflowInvocationId
    )
  }

  async save(data: CheckpointData): Promise<void> {
    try {
      // ensure checkpoint directory exists
      await mkdir(this.checkpointDir, { recursive: true })

      const checkpointFile = join(
        this.checkpointDir,
        `checkpoint_${data.timestamp}.json`
      )

      // convert sets and maps to arrays for serialization
      const serializable = {
        ...data,
        completedNodes: Array.from(data.completedNodes),
        waitingMessages: Array.from(data.waitingMessages.entries()),
        nodeMemoryUpdates: Array.from(data.nodeMemoryUpdates.entries()),
        messageQueue: data.messageQueue.map((msg) => ({
          ...msg,
          payload: msg.payload,
          originInvocationId: msg.originInvocationId,
          fromNodeId: msg.fromNodeId,
          toNodeId: msg.toNodeId,
          seq: msg.seq,
          wfInvId: msg.wfInvId,
        })),
      }

      await writeJsonAtomic(checkpointFile, serializable as unknown as Json)

      lgg.info(
        `[WorkflowCheckpoint] Saved checkpoint for ${this.workflowInvocationId} at ${checkpointFile}`
      )

      // clean old checkpoints
      await this.cleanOldCheckpoints()
    } catch (error) {
      lgg.error(
        `[WorkflowCheckpoint] Failed to save checkpoint: ${(error as Error).message}`
      )
      throw error
    }
  }

  async load(timestamp?: number): Promise<CheckpointData | null> {
    try {
      let checkpointFile: string

      if (timestamp) {
        checkpointFile = join(
          this.checkpointDir,
          `checkpoint_${timestamp}.json`
        )
      } else {
        // load latest checkpoint
        const latestCheckpoint = await this.getLatestCheckpointFile()
        if (!latestCheckpoint) return null
        checkpointFile = latestCheckpoint
      }

      if (!existsSync(checkpointFile)) {
        lgg.warn(
          `[WorkflowCheckpoint] Checkpoint file not found: ${checkpointFile}`
        )
        return null
      }

      const content = await readFile(checkpointFile, "utf-8")
      const data = JSON.parse(content)

      // reconstruct sets and maps
      const checkpoint: CheckpointData = {
        ...data,
        completedNodes: new Set(data.completedNodes),
        waitingMessages: new Map(data.waitingMessages),
        nodeMemoryUpdates: new Map(data.nodeMemoryUpdates),
        messageQueue: data.messageQueue.map(
          (msg: any) =>
            new WorkflowMessage({
              originInvocationId: msg.originInvocationId,
              fromNodeId: msg.fromNodeId,
              toNodeId: msg.toNodeId,
              seq: msg.seq,
              payload: msg.payload,
              wfInvId: msg.wfInvId,
            })
        ),
      }

      lgg.info(
        `[WorkflowCheckpoint] Loaded checkpoint for ${this.workflowInvocationId} from ${checkpointFile}`
      )

      return checkpoint
    } catch (error) {
      lgg.error(
        `[WorkflowCheckpoint] Failed to load checkpoint: ${(error as Error).message}`
      )
      return null
    }
  }

  async getLatestCheckpointFile(): Promise<string | null> {
    try {
      const { readdir } = await import("fs/promises")
      const files = await readdir(this.checkpointDir)

      const checkpointFiles = files
        .filter((f) => f.startsWith("checkpoint_") && f.endsWith(".json"))
        .sort((a, b) => {
          const timestampA = parseInt(
            a.match(/checkpoint_(\d+)\.json/)?.[1] ?? "0"
          )
          const timestampB = parseInt(
            b.match(/checkpoint_(\d+)\.json/)?.[1] ?? "0"
          )
          return timestampB - timestampA
        })

      return checkpointFiles.length > 0
        ? join(this.checkpointDir, checkpointFiles[0])
        : null
    } catch {
      return null
    }
  }

  async cleanOldCheckpoints(): Promise<void> {
    try {
      const { readdir, unlink } = await import("fs/promises")
      const files = await readdir(this.checkpointDir)

      const checkpointFiles = files
        .filter((f) => f.startsWith("checkpoint_") && f.endsWith(".json"))
        .sort((a, b) => {
          const timestampA = parseInt(
            a.match(/checkpoint_(\d+)\.json/)?.[1] ?? "0"
          )
          const timestampB = parseInt(
            b.match(/checkpoint_(\d+)\.json/)?.[1] ?? "0"
          )
          return timestampB - timestampA
        })

      // keep only the most recent checkpoints
      if (checkpointFiles.length > this.options.maxCheckpoints) {
        const filesToDelete = checkpointFiles.slice(this.options.maxCheckpoints)

        for (const file of filesToDelete) {
          await unlink(join(this.checkpointDir, file))
          lgg.info(`[WorkflowCheckpoint] Deleted old checkpoint: ${file}`)
        }
      }
    } catch (error) {
      lgg.warn(
        `[WorkflowCheckpoint] Failed to clean old checkpoints: ${(error as Error).message}`
      )
    }
  }

  startAutoCheckpoint(getCheckpointData: () => CheckpointData): void {
    if (this.autoCheckpointTimer) return

    lgg.info(
      `[WorkflowCheckpoint] Starting auto-checkpoint every ${this.options.autoCheckpointInterval}ms`
    )

    this.autoCheckpointTimer = setInterval(() => {
      const data = getCheckpointData()
      this.save(data).catch((err) =>
        lgg.error(`[WorkflowCheckpoint] Auto-checkpoint failed: ${err}`)
      )
    }, this.options.autoCheckpointInterval)
  }

  stopAutoCheckpoint(): void {
    if (this.autoCheckpointTimer) {
      clearInterval(this.autoCheckpointTimer)
      this.autoCheckpointTimer = undefined
      lgg.info("[WorkflowCheckpoint] Stopped auto-checkpoint")
    }
  }

  async exists(): Promise<boolean> {
    const latest = await this.getLatestCheckpointFile()
    return latest !== null
  }

  static async listCheckpoints(
    workflowInvocationId: string,
    checkpointPath?: string
  ): Promise<{ timestamp: number; file: string }[]> {
    const baseDir = checkpointPath ?? join(PATHS.node.logging, "checkpoints")
    const checkpointDir = join(baseDir, workflowInvocationId)

    try {
      const { readdir } = await import("fs/promises")
      const files = await readdir(checkpointDir)

      return files
        .filter((f) => f.startsWith("checkpoint_") && f.endsWith(".json"))
        .map((f) => ({
          timestamp: parseInt(f.match(/checkpoint_(\d+)\.json/)?.[1] ?? "0"),
          file: join(checkpointDir, f),
        }))
        .sort((a, b) => b.timestamp - a.timestamp)
    } catch {
      return []
    }
  }
}

// helper to create checkpoint data from current workflow state
export function createCheckpointData(
  workflow: Workflow,
  workflowInvocationId: string,
  messageQueue: WorkflowMessage[],
  completedNodes: Set<string>,
  nodeInvocations: number,
  agentSteps: AgentSteps,
  summaries: InvocationSummary[],
  totalCost: number,
  lastNodeOutput: string,
  waitingMessages: Map<string, WorkflowMessage[]>,
  nodeMemoryUpdates?: Map<string, Record<string, string>>
): CheckpointData {
  return {
    workflowVersionId: workflow.getWorkflowVersionId(),
    workflowInvocationId,
    timestamp: Date.now(),
    messageQueue,
    completedNodes,
    nodeInvocations,
    agentSteps,
    summaries,
    totalCost,
    lastNodeOutput,
    waitingMessages,
    nodeMemoryUpdates: nodeMemoryUpdates ?? new Map(),
    metadata: { workflowId: workflow.getWorkflowId() },
  }
}
