describe("toolUse", () => {
  it("should use a tool", async () => {
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
