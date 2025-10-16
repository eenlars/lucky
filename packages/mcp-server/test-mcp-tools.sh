#!/bin/bash
# Test MCP server tool listing
# Usage: ./test-mcp-tools.sh

cd "$(dirname "$0")"

export LUCKY_API_URL=http://localhost:3000

echo "=== Testing MCP Server Tool Discovery ==="
echo ""
echo "1. Initialize MCP server..."
echo '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | \
  node dist/index.js 2>&1 | head -1 | jq '.'
echo ""

echo "2. Request tool list..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  node dist/index.js 2>&1 | head -1 | jq '.result.tools[] | {name: .name, required: .inputSchema.required}'
echo ""

echo "=== Expected output: 4 tools with proper schemas ==="
echo "✓ lucky_list_workflows (no required params)"
echo "✓ lucky_run_workflow (requires: workflow_id, input)"
echo "✓ lucky_check_status (requires: invocation_id)"
echo "✓ lucky_cancel_workflow (requires: invocation_id)"
