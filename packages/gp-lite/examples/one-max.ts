import { formatResult, GPLite, mulberry32, type GPProblem } from "gp-lite"

type Bit = 0 | 1
type BitString = Bit[]

const OneMax: GPProblem<BitString> = {
  createRandom: (rng) =>
    Array.from({ length: 64 }, () => (rng.next() < 0.5 ? 0 : 1)),
  fitness: (g) => g.reduce((a, b) => a + b, 0),
  mutate: (g, rng) => {
    const c = g.slice()
    const i = rng.int(c.length)
    c[i] = c[i] === 1 ? 0 : 1
    return c
  },
  crossover: (a, b, rng) => {
    const cut = rng.int(a.length)
    return [
      [...a.slice(0, cut), ...b.slice(cut)],
      [...b.slice(0, cut), ...a.slice(cut)],
    ]
  },
}

const gp = new GPLite(OneMax, {
  popSize: 100,
  generations: 200,
  rng: mulberry32(42),
})
const res = gp.run(({ gen, best, mean }) => {
  if (gen % 10 === 0) console.log(gen, best, Math.round(mean))
})

console.log(formatResult(res))
