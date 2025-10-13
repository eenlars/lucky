import type { Connector, Publisher, Tag, Tool } from "@lucky/shared"
import { validateMockConnectors } from "@lucky/shared"

// Re-export types for compatibility
export type { Connector, Publisher, Tag }

// Map Tool type to ConnectorTool for compatibility
export type ConnectorTool = Tool & {
  status?: "pending" | "approved" | "rejected"
}

export const mockPublishers: Publisher[] = [
  {
    pub_id: "pub_001",
    slug: "slack",
    display_name: "Slack",
    verified: true,
    website_url: "https://slack.com",
    contact_email: "support@slack.com",
  },
  {
    pub_id: "pub_002",
    slug: "github",
    display_name: "GitHub",
    verified: true,
    website_url: "https://github.com",
    contact_email: "support@github.com",
  },
  {
    pub_id: "pub_003",
    slug: "google",
    display_name: "Google",
    verified: true,
    website_url: "https://google.com",
  },
  {
    pub_id: "pub_004",
    slug: "community",
    display_name: "Community",
    verified: false,
  },
  {
    pub_id: "pub_005",
    slug: "stripe",
    display_name: "Stripe",
    verified: true,
    website_url: "https://stripe.com",
  },
  {
    pub_id: "pub_006",
    slug: "tavily",
    display_name: "Tavily",
    verified: true,
    website_url: "https://tavily.com",
  },
  {
    pub_id: "pub_007",
    slug: "firecrawl",
    display_name: "Firecrawl",
    verified: true,
    website_url: "https://firecrawl.dev",
  },
]

export const mockTags: Tag[] = [
  { tag_id: "tag_001", slug: "search", name: "Search" },
  { tag_id: "tag_002", slug: "database", name: "Database" },
  { tag_id: "tag_003", slug: "communication", name: "Communication" },
  { tag_id: "tag_004", slug: "productivity", name: "Productivity" },
  { tag_id: "tag_005", slug: "development", name: "Development" },
  { tag_id: "tag_006", slug: "analytics", name: "Analytics" },
]

export const mockConnectors: Connector[] = [
  {
    conn_id: "conn_001",
    pub_id: "pub_002",
    slug: "github",
    display_name: "GitHub",
    short_description: "Interact with GitHub repositories, issues, and pull requests",
    long_description:
      "The GitHub connector provides comprehensive access to GitHub's API, allowing you to manage repositories, create issues, review pull requests, and automate your development workflow. Perfect for CI/CD integration and project management automation.",
    homepage_url: "https://github.com",
    repo_url: "https://github.com/github/connector",
    logo_url: "/logos/github-image.png",
    visibility: "public",
    tags: [mockTags[4], mockTags[3]],
    publisher: mockPublishers[1], // GitHub publisher
    tools: [
      {
        tool_id: "tool_001",
        name: "list_repositories",
        description: "List repositories for a user or organization",
        input_schema_json: {
          type: "object",
          properties: {
            owner: { type: "string" },
            type: { type: "string", enum: ["all", "public", "private"] },
          },
        },
        status: "approved",
      },
      {
        tool_id: "tool_002",
        name: "create_issue",
        description: "Create a new issue in a repository",
        input_schema_json: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            title: { type: "string" },
            body: { type: "string" },
          },
        },
        status: "approved",
      },
      {
        tool_id: "tool_003",
        name: "get_pull_request",
        description: "Get details of a pull request",
        input_schema_json: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            pr_number: { type: "number" },
          },
        },
        status: "approved",
      },
    ],
    status: "installed",
    health: "healthy",
    enabled: true,
  },
  {
    conn_id: "conn_002",
    pub_id: "pub_003",
    slug: "gmail",
    display_name: "Gmail",
    short_description: "Send emails and manage your Gmail inbox",
    long_description:
      "Connect to Gmail to send emails, search messages, manage labels, and automate your email workflow. Supports OAuth2 authentication for secure access to your Gmail account.",
    homepage_url: "https://gmail.com",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg",
    visibility: "public",
    tags: [mockTags[2], mockTags[3]],
    publisher: mockPublishers[2],
    tools: [
      {
        tool_id: "tool_004",
        name: "send_email",
        description: "Send an email message",
        input_schema_json: {
          type: "object",
          properties: {
            to: { type: "string" },
            subject: { type: "string" },
            body: { type: "string" },
          },
        },
        status: "approved",
      },
      {
        tool_id: "tool_005",
        name: "search_messages",
        description: "Search for messages in inbox",
        input_schema_json: {
          type: "object",
          properties: {
            query: { type: "string" },
            max_results: { type: "number" },
          },
        },
        status: "approved",
      },
    ],
    status: "installed",
    health: "healthy",
    enabled: false,
  },
  {
    conn_id: "conn_003",
    pub_id: "pub_004",
    slug: "postgres",
    display_name: "PostgreSQL",
    short_description: "Execute queries and manage PostgreSQL databases",
    long_description:
      "Direct connection to PostgreSQL databases for executing queries, managing schemas, and performing database operations. Supports connection pooling and prepared statements for optimal performance.",
    homepage_url: "https://www.postgresql.org",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg",
    visibility: "public",
    tags: [mockTags[1]],
    publisher: mockPublishers[3], // Community
    tools: [
      {
        tool_id: "tool_006",
        name: "execute_query",
        description: "Execute a SQL query",
        input_schema_json: {
          type: "object",
          properties: {
            query: { type: "string" },
            params: { type: "array" },
          },
        },
        status: "approved",
      },
      {
        tool_id: "tool_007",
        name: "list_tables",
        description: "List all tables in the database",
        input_schema_json: {
          type: "object",
          properties: {
            schema: { type: "string", default: "public" },
          },
        },
        status: "approved",
      },
    ],
    status: "available",
  },
  {
    conn_id: "conn_004",
    pub_id: "pub_006",
    slug: "tavily",
    display_name: "Tavily",
    short_description: "AI-powered search API for research and information gathering",
    long_description:
      "Tavily provides an AI-optimized search API designed for LLMs and research applications. Get comprehensive search results with context and relevance scoring.",
    homepage_url: "https://tavily.com",
    logo_url: "/logos/tavily.svg",
    visibility: "public",
    tags: [mockTags[0]],
    publisher: mockPublishers[5], // Tavily
    tools: [
      {
        tool_id: "tool_008",
        name: "search",
        description: "Search the web with AI-optimized results",
        input_schema_json: {
          type: "object",
          properties: {
            query: { type: "string" },
            search_depth: { type: "string", enum: ["basic", "advanced"], default: "basic" },
            max_results: { type: "number", default: 5 },
          },
        },
        status: "approved",
      },
    ],
    status: "available",
  },
  {
    conn_id: "conn_005",
    pub_id: "pub_001",
    slug: "slack",
    display_name: "Slack",
    short_description: "Send messages and interact with Slack workspaces",
    long_description:
      "Integrate with Slack to send messages, create channels, manage users, and automate your team communication. Supports both bot tokens and user tokens.",
    homepage_url: "https://slack.com",
    repo_url: "https://github.com/slack/connector",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg",
    visibility: "public",
    tags: [mockTags[2], mockTags[3]],
    publisher: mockPublishers[0], // Slack publisher
    tools: [
      {
        tool_id: "tool_009",
        name: "send_message",
        description: "Send a message to a channel",
        input_schema_json: {
          type: "object",
          properties: {
            channel: { type: "string" },
            text: { type: "string" },
          },
        },
        status: "approved",
      },
      {
        tool_id: "tool_010",
        name: "list_channels",
        description: "List all channels in workspace",
        input_schema_json: {
          type: "object",
          properties: {
            exclude_archived: { type: "boolean", default: true },
          },
        },
        status: "approved",
      },
    ],
    status: "available",
  },
  {
    conn_id: "conn_006",
    pub_id: "pub_004",
    slug: "notion",
    display_name: "Notion",
    short_description: "Create and manage Notion pages and databases",
    long_description:
      "Access your Notion workspace to create pages, update databases, and organize your knowledge base programmatically.",
    homepage_url: "https://notion.so",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
    visibility: "public",
    tags: [mockTags[3]],
    publisher: mockPublishers[3],
    tools: [
      {
        tool_id: "tool_011",
        name: "create_page",
        description: "Create a new page",
        input_schema_json: {
          type: "object",
          properties: {
            parent: { type: "string" },
            title: { type: "string" },
            content: { type: "object" },
          },
        },
        status: "approved",
      },
    ],
    status: "available",
  },
  {
    conn_id: "conn_007",
    pub_id: "pub_005",
    slug: "stripe",
    display_name: "Stripe",
    short_description: "Process payments and manage subscriptions",
    long_description:
      "Integrate Stripe for payment processing, subscription management, customer handling, and financial reporting.",
    homepage_url: "https://stripe.com",
    logo_url:
      "https://images.ctfassets.net/fzn2n1nzq965/HTTOloNPhisV9P4hlMPNA/cacf1bb88b9fc492dfad34378d844280/Stripe_icon_-_square.svg",
    visibility: "public",
    tags: [mockTags[3]],
    publisher: mockPublishers[4], // Stripe publisher
    tools: [
      {
        tool_id: "tool_012",
        name: "create_payment",
        description: "Create a payment intent",
        input_schema_json: {
          type: "object",
          properties: {
            amount: { type: "number" },
            currency: { type: "string" },
          },
        },
        status: "approved",
      },
    ],
    status: "available",
  },
  {
    conn_id: "conn_008",
    pub_id: "pub_003",
    slug: "google-analytics",
    display_name: "Google Analytics",
    short_description: "Track and analyze website traffic and user behavior",
    long_description:
      "Access Google Analytics data to track website performance, user behavior, and conversion metrics. Generate custom reports and export data for analysis.",
    homepage_url: "https://analytics.google.com",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/7/77/GAnalytics.svg",
    visibility: "public",
    tags: [mockTags[5]],
    publisher: mockPublishers[2],
    tools: [
      {
        tool_id: "tool_013",
        name: "get_report",
        description: "Get analytics report",
        input_schema_json: {
          type: "object",
          properties: {
            view_id: { type: "string" },
            date_range: { type: "object" },
            metrics: { type: "array" },
          },
        },
        status: "approved",
      },
    ],
    status: "available",
  },
  {
    conn_id: "conn_009",
    pub_id: "pub_007",
    slug: "firecrawl",
    display_name: "Firecrawl",
    short_description: "Web scraping and data extraction API",
    long_description:
      "Firecrawl turns any website into clean, LLM-ready data. Extract markdown, structured data, screenshots, and more from any webpage with a simple API.",
    homepage_url: "https://firecrawl.dev",
    logo_url: "/logos/firecrawl.svg",
    visibility: "public",
    tags: [mockTags[0], mockTags[3]], // Search and Productivity
    publisher: mockPublishers[6], // Firecrawl publisher
    tools: [
      {
        tool_id: "tool_014",
        name: "scrape",
        description: "Scrape a webpage and extract clean markdown",
        input_schema_json: {
          type: "object",
          properties: {
            url: { type: "string" },
            formats: { type: "array", items: { type: "string", enum: ["markdown", "html", "links"] } },
            onlyMainContent: { type: "boolean", default: true },
          },
        },
        status: "approved",
      },
      {
        tool_id: "tool_015",
        name: "crawl",
        description: "Crawl an entire website",
        input_schema_json: {
          type: "object",
          properties: {
            url: { type: "string" },
            maxDepth: { type: "number", default: 2 },
            limit: { type: "number", default: 10 },
          },
        },
        status: "approved",
      },
    ],
    status: "available",
  },
]

// Validate all mock data
// This ensures our mock data matches the database schema
try {
  validateMockConnectors(mockConnectors)
} catch (error) {
  // In development, throw to catch schema mismatches early
  if (process.env.NODE_ENV === "development") {
    throw error
  }
}
