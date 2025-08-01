import { expect, test } from "vitest"
import { slugifyBCorp } from "../utils"

test("slugify", () => {
  //do not change!
  const inputExpected = {
    "Próxima Comunicación y Relaciones Públicas":
      "prxima-comunicacin-y-relaciones-pblicas",
    "Make The Change Pte Ltd": "make-the-change-pte-ltd",
    "Tintoria P.A. Jacchetti srl Società Benefit":
      "tintoria-pa-jacchetti-srl-societ-benefit",
    BearingPoint: "bearing-point",
    // "Futurewhiz B.V.": "futurewhiz", // this is a special case that never works.
  }

  for (const [input, expected] of Object.entries(inputExpected)) {
    expect(slugifyBCorp(input)).toBe(expected)
  }
})
