/**
 * Type-safe runtime context for storing arbitrary values during execution.
 * Provides a Map-like interface with optional type safety when initialized with a schema.
 */

type RecordToTuple<T extends Record<string, any>> = {
  [K in keyof T]: [K, T[K]]
}[keyof T][]

export class RuntimeContext<Values extends Record<string, any> | unknown = unknown> {
  private registry = new Map<string, unknown>()

  constructor(
    iterable?: Values extends Record<string, any>
      ? RecordToTuple<Partial<Values>>
      : Iterable<readonly [string, unknown]>,
  ) {
    this.registry = new Map(iterable)
  }

  // Type-safe setter
  set<K extends Values extends Record<string, any> ? keyof Values : string>(
    key: K,
    value: Values extends Record<string, any> ? (K extends keyof Values ? Values[K] : never) : unknown,
  ): void {
    this.registry.set(key as string, value)
  }

  // Type-safe getter
  get<K extends Values extends Record<string, any> ? keyof Values : string>(
    key: K,
  ): Values extends Record<string, any> ? (K extends keyof Values ? Values[K] : never) : unknown {
    return this.registry.get(key as string) as any
  }

  has(key: string): boolean {
    return this.registry.has(key)
  }

  delete(key: string): boolean {
    return this.registry.delete(key)
  }

  entries(): IterableIterator<[string, any]> {
    return this.registry.entries()
  }

  toJSON(): Record<string, any> {
    return Object.fromEntries(this.registry)
  }

  clear(): void {
    this.registry.clear()
  }

  get size(): number {
    return this.registry.size
  }
}
