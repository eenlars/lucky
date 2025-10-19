# Changelog

## [1.0.0] - 2025-10-19

### Initial Release

**Major API Redesign**: Pivoted from web scraping tools to workflow management and execution.

### Added

- Complete workflow management API
  - `lucky_list_workflows` - List all available workflows for authenticated user
  - `lucky_run_workflow` - Execute workflows with configurable timeout and tracing
  - `lucky_check_status` - Check execution status and retrieve results
  - `lucky_cancel_workflow` - Cancel running workflow executions
- Async/sync execution modes
  - Sync mode (timeoutMs ≤ 30s) returns results immediately
  - Async mode (timeoutMs > 30s) returns invocation ID for polling
- Request validation using Zod schemas
- Comprehensive error handling with JSON-RPC error codes
- Support for both stdio and HTTP streaming transports
- Environment variable configuration for API endpoints
- Detailed error messages and logging

### Breaking Changes

- **Removed**: All web scraping tools (`lucky_scrape`, `lucky_batch_scrape`, `lucky_map`, `lucky_crawl`, `lucky_search`, `lucky_extract`)
- **Changed**: API now focuses on workflow invocation instead of content extraction
- **Changed**: Authentication via `luckyApiKey` in session data instead of bearer tokens

### Technical

- Built with FastMCP framework for robust MCP server implementation
- Zod v4 for runtime type validation
- Supports Node.js 18+
- Published as `@eenlars/mcp` on npm
