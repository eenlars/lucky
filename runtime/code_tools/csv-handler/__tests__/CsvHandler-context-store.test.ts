import type { WorkflowFile } from "@core/tools/context/contextStore.types"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import { beforeEach, describe, expect, it } from "vitest"
import { CsvHandler } from "../main/CsvHandler"

describe("CsvHandler ContextStore Integration", () => {
  let contextStore: any
  let csvHandler: CsvHandler

  beforeEach(() => {
    // create a mock context store
    contextStore = createContextStore("memory", "test-workflow-id")

    // create a dummy workflow file (not used for write operations)
    const workflowFile: WorkflowFile = {
      filePath: "https://example.com/dummy.csv",
      store: "supabase",
      summary: "test-file-id",
    }

    csvHandler = new CsvHandler(workflowFile, contextStore)
  })

  it("should write CSV data to context store", async () => {
    const testData = [
      { name: "Alice", age: "30", city: "New York" },
      { name: "Bob", age: "25", city: "San Francisco" },
      { name: "Charlie", age: "35", city: "Chicago" },
    ]

    // write data
    await csvHandler.writeData("test-csv", testData)

    // verify raw CSV was stored
    const storedCsv = await contextStore.get("workflow", "test-csv")
    expect(storedCsv).toBeTruthy()
    expect(storedCsv).toContain("name,age,city")
    expect(storedCsv).toContain("Alice,30,New York")

    // verify parsed data was stored
    const parsedData = await contextStore.get("workflow", "test-csv_parsed")
    expect(parsedData).toBeTruthy()
    expect(parsedData.rows).toHaveLength(3)
    expect(parsedData.columns).toHaveLength(3)
    expect(parsedData.totalRows).toBe(3)
  })

  it("should append data to existing CSV in context store", async () => {
    const initialData = [{ name: "Alice", age: "30", city: "New York" }]

    const newData = [{ name: "Bob", age: "25", city: "San Francisco" }]

    // write initial data
    await csvHandler.writeData("append-test", initialData)

    // append new data
    await csvHandler.appendData("append-test", newData)

    // verify CSV contains both rows
    const storedCsv = await contextStore.get("workflow", "append-test")
    expect(storedCsv).toContain("Alice,30,New York")
    expect(storedCsv).toContain("Bob,25,San Francisco")

    // verify parsed data was updated
    const parsedData = await contextStore.get("workflow", "append-test_parsed")
    expect(parsedData.rows).toHaveLength(2)
    expect(parsedData.totalRows).toBe(2)
  })

  it("should prevent overwriting without overwrite flag", async () => {
    const data = [{ name: "Test", value: "123" }]

    // write initial data
    await csvHandler.writeData("no-overwrite-test", data)

    // try to write again without overwrite flag
    await expect(csvHandler.writeData("no-overwrite-test", data)).rejects.toThrow(
      "data already exists with key: no-overwrite-test"
    )

    // should work with overwrite flag
    await expect(csvHandler.writeData("no-overwrite-test", data, { overwrite: true })).resolves.not.toThrow()
  })
})
