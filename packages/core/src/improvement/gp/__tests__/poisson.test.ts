import { EvolutionUtils } from "../rsc/utils"

describe("EvolutionUtils.poisson", () => {
  test("should return non-negative integers", () => {
    const average = 2
    const numbers: number[] = []
    for (let i = 0; i < 1000; i++) {
      const result = EvolutionUtils.poisson(average)
      numbers.push(result)
    }
    // get the average of the numbers
    const averageOfNumbers = numbers.reduce((a, b) => a + b, 0) / numbers.length

    // calculate standard deviation
    const variance = numbers.reduce((sum, num) => sum + (num - averageOfNumbers) ** 2, 0) / numbers.length
    const standardDeviation = Math.sqrt(variance)

    // get min and max
    const min = Math.min(...numbers)
    const max = Math.max(...numbers)

    console.log(`Average: ${averageOfNumbers}`)
    console.log(`Standard Deviation: ${standardDeviation}`)
    console.log(`Min: ${min}`)
    console.log(`Max: ${max}`)

    expect(averageOfNumbers).toBeCloseTo(average, 0)
  })
})
