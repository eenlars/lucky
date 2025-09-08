/**
 * Stall detection for AI model requests.
 *
 * Implements dual-timeout system to detect and handle stalled AI model calls:
 * - Overall timeout: Maximum total time for request completion
 * - Stall timeout: Maximum time between tokens/progress updates
 *
 * Prevents hanging requests that stop producing tokens but don't terminate.
 *
 * @module messages/api/stallGuard
 */

import { CONFIG } from "@runtime/settings/constants"
import { generateText, StepResult } from "ai"
import pTimeout from "p-timeout"

/**
 * Executes AI text generation with stall detection and timeout protection.
 *
 * @param base - Parameters for generateText function
 * @param options - Timeout configuration
 * @param options.modelName - Model name for error messages
 * @param options.overallTimeoutMs - Maximum total execution time
 * @param options.stallTimeoutMs - Maximum time between progress updates
 *
 * @returns Generated text result of type R
 *
 * @throws Error on overall timeout or stall detection
 *
 * @remarks
 * - Disabled when CONFIG.limits.enableStallGuard is false
 * - Resets stall timer on each token/step completion
 * - Aborts request on stall detection
 *
 * @example
 * const result = await runWithStallGuard(
 *   { messages, model },
 *   {
 *     modelName: "claude-3",
 *     overallTimeoutMs: 60000,
 *     stallTimeoutMs: 10000
 *   }
 * )
 */
export async function runWithStallGuard<R>(
  base: Parameters<typeof generateText>[0],
  {
    modelName,
    overallTimeoutMs,
    stallTimeoutMs,
  }: {
    modelName: string
    overallTimeoutMs: number
    stallTimeoutMs: number
  }
): Promise<R> {
  if (!CONFIG.limits.enableStallGuard) {
    return (await generateText(base)) as R
  }

  /* --------------------------------------------------------  set-up abort -- */
  const ctrl = new AbortController()

  /* -----------------------------------------------  set-up “stall” promise -- */
  let rejectBecauseOfStall!: (err: Error) => void

  const stallPromise = new Promise<never>((_, reject) => {
    rejectBecauseOfStall = reject
  })

  let stallTimer: ReturnType<typeof setTimeout> | undefined

  const armStallTimer = () => {
    if (stallTimer) clearTimeout(stallTimer)
    stallTimer = setTimeout(() => {
      const err = new Error(
        `
        Stall timeout (${stallTimeoutMs} ms) 
        for ${modelName} with ${base.messages?.length} messages 
        and ${base.messages?.reduce((acc, msg) => acc + msg.content.length, 0)} chars
        `.replace(/\s+\n/g, " ")
      )
      ctrl.abort() // stop the request itself
      rejectBecauseOfStall(err) // make the race() reject with *our* error
    }, stallTimeoutMs)
  }
  const restartStallTimer = armStallTimer

  /* ------------------------------------------------------  wire-up hooks -- */
  const userStepCb = base.onStepFinish
  const params: Parameters<typeof generateText>[0] = {
    ...base,
    abortSignal: ctrl.signal,
    onStepFinish(step: StepResult<any>) {
      restartStallTimer() // every token resets the watchdog
      userStepCb?.(step) // keep user callback intact
    },
  }

  /* -----------------------------------------------------------  execution -- */

  // Start the request first, *then* arm the stall timer so queuing time
  // does not count as “silence”.
  const generation = (async () => {
    const p = generateText<any, any, any>(params)
    restartStallTimer()
    return (await p) as R
  })()

  try {
    // 1. overall wall-clock timeout
    // 2. stall timeout
    return await pTimeout(Promise.race([generation, stallPromise]), {
      milliseconds: overallTimeoutMs,
      message: new Error(
        `Overall timeout (${overallTimeoutMs} ms) for ${modelName}`
      ),
    })
  } finally {
    if (stallTimer) clearTimeout(stallTimer)
  }
}
