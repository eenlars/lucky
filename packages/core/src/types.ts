export type FlowCoordinationType = "sequential" | "hierarchical"
export type FlowEvolutionMode = "iterative" | "GP"

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

export type FlowRuntimeConfig = {
  readonly coordinationType: FlowCoordinationType
  readonly newNodeProbability: number
  readonly logging: {
    readonly level: "none" | "error" | "info" | "debug"
    readonly override: {
      readonly API: boolean
      readonly GP: boolean
      readonly Database: boolean
      readonly Tools: boolean
      readonly Summary: boolean
      readonly InvocationPipeline: boolean
      readonly Messaging: boolean
      readonly Improvement: boolean
      readonly ValidationBeforeHandoff: boolean
      readonly Setup: boolean
    }
  }
  readonly workflow: {
    readonly parallelExecution: boolean
    readonly asyncExecution: boolean
    readonly maxTotalNodeInvocations: number
    readonly maxPerNodeInvocations?: number
    readonly maxNodes: number
    readonly handoffContent: "summary" | "full"
    readonly prepareProblem: boolean
    readonly prepareProblemMethod: "ai" | "workflow"
    readonly prepareProblemWorkflowVersionId: string
  }
  readonly tools: {
    readonly inactive: string[]
    readonly uniqueToolsPerAgent: boolean
    readonly uniqueToolSetsPerAgent: boolean
    readonly maxToolsPerAgent: number
    readonly maxStepsVercel: number
    readonly defaultTools: string[]
    readonly autoSelectTools: boolean
    readonly usePrepareStepStrategy: boolean
    readonly experimentalMultiStepLoop: boolean
    readonly showParameterSchemas: boolean
    readonly experimentalMultiStepLoopMaxRounds: number
  }
  readonly models: {
    readonly inactive: string[]
    readonly provider: FullFlowRuntimeConfig["MODELS"]["provider"]
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
  readonly evolution: {
    readonly iterativeIterations: number
    readonly GP: {
      readonly generations: number
      readonly populationSize: number
      readonly verbose: boolean
      readonly initialPopulationMethod: "random" | "baseWorkflow" | "prepared"
      readonly initialPopulationFile: string | null
      readonly maximumTimeMinutes: number
    }
  }
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
  MODELS: {
    inactive: string[]
    provider: "openai" | "openrouter" | "groq"
  }
}
