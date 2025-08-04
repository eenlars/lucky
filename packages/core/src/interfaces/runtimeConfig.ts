import type { ModelRuntimeConfig } from "@/config"
import type { EvolutionSettings } from "@/improvement/gp/resources/evolution-types"

export type FlowCoordinationType = "sequential" | "hierarchical"
export type FlowEvolutionMode = "cultural" | "GP"

export interface FlowCallCost {
  usdCost: number
}

export type FlowPathsConfig = {
  readonly root: string
  readonly app: string
  readonly runtime: string
  readonly codeTools: string
  readonly setupFile: string
  readonly improver: string
  readonly node: {
    readonly logging: string
    readonly memory: {
      readonly root: string
      readonly workfiles: string
    }
    readonly error: string
  }
}

export type FlowEvolutionConfig = {
  readonly mode: FlowEvolutionMode
  readonly generationAmount: number
  readonly initialPopulationMethod: "random" | "baseWorkflow" | "prepared"
  readonly initialPopulationFile: string | null
  readonly GP: EvolutionSettings
}

export type FlowRuntimeConfig = {
  readonly coordinationType: FlowCoordinationType
  readonly newNodeProbability: number
  readonly logging: {
    readonly level: "none" | "error" | "info" | "debug"
    readonly override: Record<string, unknown>
  }
  readonly workflow: {
    readonly parallelExecution: boolean
    readonly asyncExecution: boolean
    readonly maxNodeInvocations: number
    readonly maxNodes: number
    readonly handoffContent: "summary" | "full"
    readonly prepareProblem: boolean
    readonly prepareProblemMethod: "ai" | "workflow"
    readonly prepareProblemWorkflowVersionId: string
  }
  readonly tools: {
    readonly inactive: Set<string>
    readonly uniqueToolsPerAgent: boolean
    readonly uniqueToolSetsPerAgent: boolean
    readonly maxToolsPerAgent: number
    readonly maxStepsVercel: number
    readonly defaultTools: Set<string>
    readonly autoSelectTools: boolean
    readonly usePrepareStepStrategy: boolean
    readonly experimentalMultiStepLoop: boolean
    readonly showParameterSchemas: boolean
    readonly experimentalMultiStepLoopMaxRounds: number
  }
  readonly models: {
    readonly inactive: Set<string>
    readonly provider: ModelRuntimeConfig["provider"]
  }
  readonly improvement: {
    readonly fitness: {
      readonly timeThresholdSeconds: number
      readonly baselineTimeSeconds: number
      readonly baselineCostUsd: number
      readonly costThresholdUsd: number
      readonly weights: {
        readonly score: number
        readonly time: number
        readonly cost: number
      }
    }
    readonly flags: {
      readonly selfImproveNodes: boolean
      readonly addTools: boolean
      readonly analyzeWorkflow: boolean
      readonly removeNodes: boolean
      readonly editNodes: boolean
      readonly maxRetriesForWorkflowRepair: number
      readonly useSummariesForImprovement: boolean
      readonly improvementType: "judge" | "unified"
      readonly operatorsWithFeedback: boolean
    }
  }
  readonly verification: {
    readonly allowCycles: boolean
    readonly enableOutputValidation: boolean
  }
  readonly context: {
    readonly maxFilesPerWorkflow: number
    readonly enforceFileLimit: boolean
  }
  readonly evolution: FlowEvolutionConfig
  readonly ingestion: {
    readonly taskLimit: number
  }
  readonly limits: {
    readonly maxConcurrentWorkflows: number
    readonly maxConcurrentAIRequests: number
    readonly maxCostUsdPerRun: number
    readonly enableSpendingLimits: boolean
    readonly maxRequestsPerWindow: number
    readonly rateWindowMs: number
    readonly enableStallGuard: boolean
    readonly enableParallelLimit: boolean
  }
}

export type FullFlowRuntimeConfig = {
  CONFIG: FlowRuntimeConfig
  PATHS: FlowPathsConfig
  MODELS: ModelRuntimeConfig
}
