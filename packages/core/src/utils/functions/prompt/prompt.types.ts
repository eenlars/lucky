import type { ModelMessage } from "ai"

export type NonEmpty<S extends string> = S extends "" ? never : S

export interface FormatOptions {
  readonly joiner?: " " | "\n"
  readonly addTerminalPunctuation?: boolean
  readonly labels?: {
    readonly limitations?: string
    readonly role?: string
    readonly context?: string
    readonly output?: string
  }
}

export interface PromptBuilderOptions {
  readonly joiner: " " | "\n"
  readonly addTerminalPunctuation: boolean
  readonly labels: {
    readonly limitations: string
    readonly role?: string
    readonly context?: string
    readonly output: string
  }
}

export type PromptMessage = readonly [ModelMessage]

export type PromptBuilder = PromptMessage & {
  limitations(limitation: string | undefined | null): PromptBuilder
  limitations(limitations: ReadonlyArray<string>): PromptBuilder

  role(role: string | undefined | null): PromptBuilder
  role(roles: ReadonlyArray<string>): PromptBuilder

  context(context: string | undefined | null): PromptBuilder
  context(contexts: ReadonlyArray<string>): PromptBuilder

  output(spec: string | undefined | null): PromptBuilder
  output(specs: ReadonlyArray<string>): PromptBuilder

  withOptions(opts: FormatOptions): PromptBuilder

  /** Convenience getters */
  readonly content: string
}
