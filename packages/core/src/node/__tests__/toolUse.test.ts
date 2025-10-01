// TODO: this entire test file is commented out and provides no value. it appears
// to be testing selectToolStrategyV2 but all the actual test code is commented.
// the test should either be fixed and uncommented, or removed entirely. having
// a test file with no actual tests is misleading and adds confusion.
describe("toolUse", () => {
  it("should use a tool", async () => {
    // TODO: the test name "should use a tool" is too vague and doesn't describe
    // what specific behavior is being tested. also, the variable name
    // "toolOutputFirecrawlExampleOutputWrong" suggests this is testing error
    // handling but the data looks like a valid tool output.
    const toolOutputFirecrawlExampleOutputWrong = {
      type: "tool",
      name: "firecrawl_search",
      args: {
        query: "Rituals store locator Netherlands",
        limit: 10,
        lang: "en",
        country: "nl",
      },
      return: { content: [], isError: false },
    }

    const agentSteps = [toolOutputFirecrawlExampleOutputWrong]

    // const strategy = await selectToolStrategyV2(
    // //   TOOLS.mcp.firecrawl,
    //   agentSteps,
    //   agentSteps,
    //   "",
    //   0,
    //   ""
    // )

    // expect(strategy).toEqual({
    //   type: "tool",
    //   name: "firecrawl_search",
    //   args: {
    //     query: "Rituals store locator Netherlands",
    //     limit: 10,
    //     lang: "en",
    //     country: "nl",
    //   },
    // })
  })
})
