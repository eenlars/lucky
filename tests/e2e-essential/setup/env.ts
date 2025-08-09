// Minimal env to satisfy core's env schema in tests
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "test-google"
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-openai"
process.env.SERPAPI_API_KEY = process.env.SERPAPI_API_KEY || "test-serpapi"
process.env.OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY || "test-openrouter"
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || "test-groq"
process.env.TAVILY_API_KEY = process.env.TAVILY_API_KEY || "test-tavily"
process.env.MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || "test-mapbox"
