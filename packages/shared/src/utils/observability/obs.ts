// obs.ts - Observability utility for structured logging and tracing
import { AsyncLocalStorage } from "node:async_hooks"

type Attr = string | number | boolean | undefined
export type Attrs = Record<string, Attr>
export type Ctx = { wfId?: string; nodeId?: string; nodeInvocationId?: string }

export interface Sink {
  event(rec: Record<string, unknown>): void
}

export class StdoutSink implements Sink {
  event(rec: Record<string, unknown>) {
    try {
      console.log(JSON.stringify(rec))
    } catch {}
  }
}
export class MemorySink implements Sink {
  events: Record<string, unknown>[] = []
  event(rec: Record<string, unknown>) {
    this.events.push(rec)
  }
}
export class TeeSink implements Sink {
  constructor(private sinks: Sink[]) {}
  event(rec: Record<string, unknown>) {
    for (const s of this.sinks) s.event(rec)
  }
}

let currentSink: Sink = new StdoutSink()
export function setSink(s: Sink) {
  currentSink = s
}

// AsyncLocalStorage for correlation context
const als = new AsyncLocalStorage<Record<string, unknown>>()

function currentCtx(): Record<string, unknown> {
  return als.getStore() ?? {}
}

function emit(ctx: Ctx | undefined, name: string, attrs: Attrs = {}) {
  const correlation = currentCtx()
  currentSink.event({
    ts: new Date().toISOString(),
    event: name,
    ...correlation,
    ...ctx,
    ...attrs,
  })
}

export function event(ctx: Ctx | undefined, name: string, attrs?: Attrs) {
  emit(ctx, name, attrs ?? {})
}

export async function withSpan<T>(ctx: Ctx | undefined, name: string, attrs: Attrs, fn: () => Promise<T>): Promise<T> {
  emit(ctx, `${name}:start`, attrs)
  const t0 = performance.now()
  try {
    const out = await fn()
    emit(ctx, `${name}:end`, {
      status: "ok",
      duration_ms: Math.round(performance.now() - t0),
    })
    return out
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    emit(ctx, `${name}:end`, {
      status: "error",
      reason: errorMessage,
      duration_ms: Math.round(performance.now() - t0),
    })
    throw e
  }
}

// ALS-first API: no ctx threading
export const obs = {
  scope<T>(values: Record<string, unknown>, fn: () => Promise<T> | T): Promise<T> | T {
    const parent = currentCtx()
    const merged = { ...parent, ...values }
    return als.run(merged, fn)
  },
  set(key: string, value: unknown): void {
    const store = als.getStore()
    if (store) store[key] = value
  },
  get<T = unknown>(key: string): T | undefined {
    const store = als.getStore()
    return (store ? store[key] : undefined) as T | undefined
  },
  event(name: string, attrs?: Attrs): void {
    emit(undefined, name, attrs ?? {})
  },
  span<T>(name: string, attrs: Attrs, fn: () => Promise<T>): Promise<T> {
    return withSpan(undefined, name, attrs, fn)
  },
}
