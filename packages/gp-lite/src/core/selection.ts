import type { Selector } from "../types"

/**
 * Tournament selection: sample `size` individuals and pick the best fitness.
 * Small size keeps pressure low; larger size increases selection pressure.
 */
export function tournament<T>(size = 3): Selector<T> {
  return (pop, rng) => {
    let best = rng.int(pop.length)
    for (let i = 1; i < size; ++i) {
      const c = rng.int(pop.length)
      if (pop[c].f > pop[best].f) best = c
    }
    return best
  }
}
