import type { EvaluationInput } from "@workflow/ingestion/ingestion.types"
import type {
  TOOL_CONFIG,
  TOOL_IMPROVEMENT_CONFIG,
  TOOLS,
} from "@example/settings/tools"
import type { AllToolNames } from "@tools/tool.types"
import type { LuckyProvider } from "@utils/models/models.types"
import type { EvolutionSettings } from "../../improvement/gp/resources/evolution-types"
import type { AllowedModelName } from "../models/models"

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

export interface ModelConfig {
  summary: AllowedModelName
  nano: AllowedModelName
  low: AllowedModelName
  medium: AllowedModelName
  high: AllowedModelName
  default: AllowedModelName
  fitness: AllowedModelName
  reasoning: AllowedModelName
  fallback: AllowedModelName
}

export interface ModelRuntimeConfig {
  provider: LuckyProvider
  inactive: Set<string>
  models: ModelConfig
}

export type FlowEvolutionConfig = {
  readonly mode: FlowEvolutionMode
  readonly generationAmount: number
  readonly initialPopulationMethod: "random" | "baseWorkflow" | "prepared"
  readonly initialPopulationFile: string | null
  readonly GP: EvolutionSettings
}

export type ToolsConfig = {
  readonly inactive: Set<AllToolNames>
  readonly uniqueToolsPerAgent: boolean
  readonly uniqueToolSetsPerAgent: boolean
  readonly maxToolsPerAgent: number
  readonly maxStepsVercel: number
  readonly defaultTools: Set<AllToolNames>
  readonly autoSelectTools: boolean
  readonly usePrepareStepStrategy: boolean
  readonly experimentalMultiStepLoop: boolean
  readonly showParameterSchemas: boolean
  readonly experimentalMultiStepLoopMaxRounds: number
}
export type LoggingTypes = {
  readonly Setup: boolean
  readonly Tools: boolean
  readonly Memory: boolean
  readonly InvocationPipeline: boolean
  readonly Messaging: boolean
  readonly ValidationBeforeHandoff: boolean
  readonly Improvement: boolean
  readonly Summary: boolean
  readonly Database: boolean
  readonly GP: boolean
  readonly API: boolean
}

export type FlowRuntimeConfig = {
  readonly coordinationType: FlowCoordinationType
  readonly newNodeProbability: number
  readonly logging: LoggingTypes
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
  readonly tools: ToolsConfig
  readonly models: ModelRuntimeConfig
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

export interface FlowSettings {
  readonly config: FlowRuntimeConfig
  readonly paths: FlowPathsConfig
  readonly modelSettings: ModelRuntimeConfig
  readonly tools: {
    readonly definitions: typeof TOOLS
    readonly config: typeof TOOL_CONFIG
    readonly improvement: typeof TOOL_IMPROVEMENT_CONFIG
  }
  readonly evolution: FlowEvolutionConfig
  readonly inputs: {
    readonly questions: Record<string, EvaluationInput>
    readonly selected: EvaluationInput
  }
}
