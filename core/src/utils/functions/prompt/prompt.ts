import type { FormatOptions, NonEmpty, PromptBuilder, PromptBuilderOptions, PromptMessage } from "./prompt.types"

export function promptr<P extends string>(text: NonEmpty<P> | P, options?: FormatOptions): PromptBuilder {
  type State = {
    readonly prompt: string
    readonly limits: ReadonlyArray<string>
    readonly roles: ReadonlyArray<string>
    readonly contexts: ReadonlyArray<string>
    readonly outputs: ReadonlyArray<string>
    readonly options: PromptBuilderOptions
  }

  const initial: State = freeze({
    prompt: safeTrim(text),
    limits: [] as const,
    roles: [] as const,
    contexts: [] as const,
    outputs: [] as const,
    options: normalizeOptions(options),
  })

  const wrap = (state: State): PromptBuilder => {
    const content = compile(state)
    const tuple = [{ role: "user", content }] as PromptMessage

    let finalized = false
    const self = tuple as unknown as PromptBuilder

    Object.defineProperties(self, {
      limitations: {
        value: (arg: string | ReadonlyArray<string> | undefined | null) => {
          const next = mergeUnique(state.limits, normalizeList(arg))
          return wrap(freeze({ ...state, limits: next }))
        },
      },
      role: {
        value: (arg: string | ReadonlyArray<string> | undefined | null) => {
          const next = mergeUnique(state.roles, normalizeList(arg))
          return wrap(freeze({ ...state, roles: next }))
        },
      },
      context: {
        value: (arg: string | ReadonlyArray<string> | undefined | null) => {
          const next = mergeUnique(state.contexts, normalizeList(arg))
          return wrap(freeze({ ...state, contexts: next }))
        },
      },
      output: {
        value: (arg: string | ReadonlyArray<string> | undefined | null) => {
          const next = mergeUnique(state.outputs, normalizeList(arg))
          return wrap(freeze({ ...state, outputs: next }))
        },
      },
      withOptions: {
        value: (opts: FormatOptions) =>
          wrap(
            freeze({
              ...state,
              options: normalizeOptions(opts, state.options),
            }),
          ),
      },
      content: {
        get: () => {
          finalized = true
          return content
        },
      },
    })

    const allowedPreFinalize = new Set<string | symbol>([
      "limitations",
      "role",
      "context",
      "output",
      "withOptions",
      "content",
      "toString",
      Symbol.toStringTag,
    ])

    const hasAllowed = (k: PropertyKey): boolean =>
      (typeof k === "string" || typeof k === "symbol") && allowedPreFinalize.has(k)

    const MSG = "PromptBuilder not finalized. Call `.content` once before using it as a PromptMessage."

    const proxy = new Proxy(self as object, {
      get(target, prop, receiver) {
        if (!finalized && !hasAllowed(prop)) throw new Error(MSG)
        return Reflect.get(target, prop, receiver)
      },
      has(target, prop) {
        if (!finalized && !hasAllowed(prop)) return false
        return Reflect.has(target, prop)
      },
      ownKeys(target) {
        if (!finalized) {
          return Array.from(allowedPreFinalize)
        }
        return Reflect.ownKeys(target)
      },
      getOwnPropertyDescriptor(target, prop) {
        if (!finalized && !hasAllowed(prop)) return undefined
        return Reflect.getOwnPropertyDescriptor(target, prop)
      },
      getPrototypeOf(target) {
        if (!finalized) return null
        return Reflect.getPrototypeOf(target)
      },
    })

    // don't freeze the proxy - the underlying array is already readonly
    return proxy as unknown as PromptBuilder
  }

  return wrap(initial)
}

// -----------------------------------------
// Internals
// -----------------------------------------
function compile(state: {
  prompt: string
  limits: ReadonlyArray<string>
  roles: ReadonlyArray<string>
  contexts: ReadonlyArray<string>
  outputs: ReadonlyArray<string>
  options: PromptBuilderOptions
}): string {
  const { addTerminalPunctuation, joiner, labels } = state.options
  const parts: string[] = []

  if (state.prompt) parts.push(sentence(state.prompt, addTerminalPunctuation))

  if (state.limits.length) {
    parts.push(sentence(`${labels.limitations}: ${state.limits.join("; ")}`, addTerminalPunctuation))
  }

  if (state.roles.length && labels.role) {
    parts.push(sentence(`${labels.role}: ${state.roles.join("; ")}`, addTerminalPunctuation))
  }

  if (state.contexts.length && labels.context) {
    parts.push(sentence(`${labels.context}: ${state.contexts.join("; ")}`, addTerminalPunctuation))
  }

  if (state.outputs.length) {
    parts.push(sentence(`${labels.output}: ${state.outputs.join("; ")}`, addTerminalPunctuation))
  }

  return normalizeWhitespace(parts.join(joiner))
}

function normalizeOptions(opts?: FormatOptions, base?: PromptBuilderOptions): PromptBuilderOptions {
  const joiner = opts?.joiner ?? base?.joiner ?? " "
  const addTerminalPunctuation = opts?.addTerminalPunctuation ?? base?.addTerminalPunctuation ?? true

  const labels = {
    limitations: opts?.labels?.limitations ?? base?.labels?.limitations ?? "Your limitations are",
    role: opts?.labels?.role ?? base?.labels?.role ?? "Your role is",
    context: opts?.labels?.context ?? base?.labels?.context ?? "Your context is",
    output: opts?.labels?.output ?? base?.labels?.output ?? "Your output should be",
  } as const

  return freeze({ joiner, addTerminalPunctuation, labels })
}

function sentence(s: string, punct: boolean): string {
  const t = safeTrim(s)
  if (!t) return ""
  return punct && !/[.!?…”’)"\]]$/u.test(t) ? `${t}.` : t
}

function normalizeList(arg: string | ReadonlyArray<string> | undefined | null): ReadonlyArray<string> {
  if (!arg) return [] as const
  const list = Array.isArray(arg) ? arg : [arg]
  return list.map(safeTrim).filter(Boolean)
}

function mergeUnique(existing: ReadonlyArray<string>, incoming: ReadonlyArray<string>): ReadonlyArray<string> {
  if (!incoming.length) return existing
  const seen = new Set(existing.map(k => k.toLocaleLowerCase()))
  const out: string[] = [...existing]
  for (const item of incoming) {
    const key = item.toLocaleLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(item)
    }
  }
  return freezeArray(out)
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim()
}

function safeTrim(s: string): string {
  return (s ?? "").toString().trim()
}

function freeze<T extends object>(o: T): Readonly<T> {
  return Object.freeze(o)
}
function freezeArray<T>(a: T[]): readonly T[] {
  return Object.freeze(a.slice())
}
