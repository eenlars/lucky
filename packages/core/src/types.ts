import type { LegacyRuntimeConfig } from "@core/core-config/compat"
import type { RuntimeConfig } from "@lucky/shared/contracts/config"

export type FlowCoordinationType = RuntimeConfig["coordinationType"]
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

export type FlowRuntimeConfig = LegacyRuntimeConfig

export type FullFlowRuntimeConfig = {
  CONFIG: FlowRuntimeConfig
  PATHS: FlowPathsConfig
  MODELS: {
    inactive: string[]
    provider: FlowModelProvider
  }
}

export type FlowModelProvider = RuntimeConfig["models"]["provider"]
