import type { RNG } from "../types"

export function mulberry32(seed = Date.now()): RNG {
  let s = seed >>> 0
  const fn = (): number => {
    s |= 0
    s = Math.imul(s + 0x6d2b79f5, 1) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next: fn,
    // Use Math.floor to avoid 32-bit signed overflow behavior
    int: (n: number) => Math.floor(n * fn()),
  }
}
