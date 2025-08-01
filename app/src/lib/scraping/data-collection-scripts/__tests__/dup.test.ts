import type { GoogleMapsBusiness } from "@/runtime/code_tools/googlescraper/main/types/GoogleMapsBusiness"
import { beforeEach, describe, expect, it } from "vitest"
import { deduplicateBusinesses } from "../utils"

// ----------------------------------------------------------------------------
// helpers
// ----------------------------------------------------------------------------
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

const base: GoogleMapsBusiness = {
  storeName: "Dantendorfer Women | Men | Slowear",
  stars: "4.7",
  numberOfReviews: 44,
  googleUrl: "https://www.google.com/maps/search/Slowear+Austria",
  bizWebsite: "https://www.dantendorfer.at/",
  address: "Weihburggasse 9, 1010 Wien, Österreich",
  category: "Kledingwinkel",
  status: "Geopend",
  phone: "+43 1 5125965",
  mainImage: "https://picsum.photos/400/300",
  hours: {
    monday: "10:00-18:00",
    tuesday: "10:00-18:00",
    wednesday: "Gesloten",
    thursday: "Gesloten",
    friday: "10:00-18:00",
    saturday: "10:00-18:00",
    sunday: "Gesloten",
  },
  placeId: undefined,
  ratingText: undefined,
}

describe("deduplicateBusinesses", () => {
  let detail: GoogleMapsBusiness
  let main: GoogleMapsBusiness

  beforeEach(() => {
    detail = clone(base)
    main = {
      ...detail,
      placeId: "ChIJ8yHWun0FdkgReUhxpbEaShA",
      ratingText: "4.7 sterren – 44 reviews",
      stars: "4.7",
    }
  })

  // -------------------------------------------------------------------------
  // happy-path behaviour
  // -------------------------------------------------------------------------
  it("deduplicates identical storeName & picks the record with a placeId", () => {
    const input = [detail, main] // detail has no placeId
    const result = deduplicateBusinesses(clone(input))

    expect(result).toHaveLength(1)
    expect(result[0].placeId).toBe(main.placeId)
    // all other fields should come from the preferred object as well
    expect(result[0]).toStrictEqual(main)
  })

  // -------------------------------------------------------------------------
  // immutability
  // -------------------------------------------------------------------------
  it("does not mutate the original array or its objects", () => {
    const original = [clone(detail), clone(main)]
    const snapshot = clone(original)

    deduplicateBusinesses(original)

    expect(original).toStrictEqual(snapshot) // array & objects unchanged
  })

  // -------------------------------------------------------------------------
  // storeName equivalence
  // -------------------------------------------------------------------------
  it.each([
    ["Exact match", "Dantendorfer Women | Men | Slowear"],
    ["Case difference", "dantendorfer women | men | slowear"],
    ["Trailing whitespace", "Dantendorfer Women | Men | Slowear  "],
  ])("treats “%s” as the same business", (_, variant) => {
    const v1 = { ...clone(base), storeName: variant }
    const v2 = { ...clone(base), storeName: variant.toUpperCase() }

    const out = deduplicateBusinesses([v1, v2])
    expect(out).toHaveLength(1)
  })

  // -------------------------------------------------------------------------
  // handles empty / falsy input
  // -------------------------------------------------------------------------
  it.each([null, undefined, []])("returns [] for %p", (bad) => {
    const out = deduplicateBusinesses(bad)
    expect(out).toEqual([])
  })

  // -------------------------------------------------------------------------
  // keeps unique businesses
  // -------------------------------------------------------------------------
  it("keeps objects with different storeName", () => {
    const a = { ...clone(base), storeName: "Store A", placeId: "A" }
    const b = { ...clone(base), storeName: "Store B", placeId: "B" }

    const result = deduplicateBusinesses([a, b])
    expect(result).toHaveLength(2)
    expect(result).toContainEqual(a)
    expect(result).toContainEqual(b)
  })

  // -------------------------------------------------------------------------
  // large-set snapshot (regression)
  // -------------------------------------------------------------------------
  it("produces stable output for a representative mixed set (snapshot)", () => {
    const messy = [
      detail,
      main,
      { ...clone(base), storeName: "Store A", placeId: "A" },
      { ...clone(base), storeName: "Store a  " }, // case+space duplicate of Store A
      { ...clone(base), storeName: undefined, bizWebsite: "example.net" },
      {
        ...clone(base),
        storeName: undefined,
        bizWebsite: "http://example.net/",
      },
    ]

    expect(deduplicateBusinesses(messy)).toMatchSnapshot()
  })
})
