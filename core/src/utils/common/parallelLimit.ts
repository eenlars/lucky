import { CONFIG } from "@runtime/settings/constants"

const ENABLED = CONFIG.limits.enableParallelLimit

/**
 * Run async tasks in parallel with a concurrency limit.
 * @param items Array of items to process
 * @param limit Max number of concurrent promises
 * @param fn Async function to apply to each item
 * @returns Promise of results in order
 */
export async function parallelLimit<T, R>(
  items: T[],
  fn: (i: T) => Promise<R>,
  overrideLimit?: number
): Promise<R[]> {
  if (!ENABLED) {
    return Promise.all(items.map((item) => fn(item)))
  }

  const limit = overrideLimit ?? CONFIG.limits.maxConcurrentWorkflows
  const ret: R[] = []
  let idx = 0
  const pool: Promise<void>[] = []

  const enqueue = async () => {
    const i = idx++
    if (i >= items.length) return
    ret[i] = await fn(items[i])
    await enqueue()
  }

  for (let i = 0; i < Math.min(limit, items.length); i++) {
    pool.push(enqueue())
  }
  await Promise.all(pool)
  return ret
}
