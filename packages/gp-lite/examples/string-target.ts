import { GPLite, mulberry32, type GPProblem } from "gp-lite"

const target = "hello world"
type Gene = string
type Genome = Gene[]

const Alphabet = "abcdefghijklmnopqrstuvwxyz "

const StringMatch: GPProblem<Genome> = {
  createRandom: (rng) =>
    Array.from(
      { length: target.length },
      () => Alphabet[rng.int(Alphabet.length)]
    ),
  fitness: (g) => {
    let score = 0
    for (let i = 0; i < g.length; i++) if (g[i] === target[i]) score++
    return score
  },
  mutate: (g, rng) => {
    const c = g.slice()
    c[rng.int(c.length)] = Alphabet[rng.int(Alphabet.length)]
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

const gp = new GPLite(StringMatch, {
  popSize: 200,
  generations: 400,
  rng: mulberry32(7),
})
const res = gp.run(({ gen, best }) => {
  if (gen % 20 === 0) console.log(gen, best)
})

console.log("Best fitness:", res.bestFitness)
