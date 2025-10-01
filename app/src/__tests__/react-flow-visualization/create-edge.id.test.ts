import { describe, expect, it } from "vitest"
import { createEdge } from "@/react-flow-visualization/components/edges"

describe("createEdge id format", () => {
  it("includes handles when present", () => {
    const e = createEdge("a", "b", "h1", "h2")
    expect(e.id).toBe("a-h1-b-h2")
    expect(e.sourceHandle).toBe("h1")
    expect(e.targetHandle).toBe("h2")
  })

  it("omits handle segments when not provided", () => {
    const e = createEdge("a", "b")
    expect(e.id).toBe("a--b-")
    expect(e.sourceHandle).toBeUndefined()
    expect(e.targetHandle).toBeUndefined()
  })
})
