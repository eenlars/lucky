# Manual Testing Guide: MCP Workflow Integration

**Last Updated**: 2025-10-16
**Status**: Ready for Testing
**Prerequisites**: Phase 1 & 2 Complete ✅

---

## Overview

This guide provides step-by-step instructions for manually testing the MCP (Model Context Protocol) workflow integration with Claude Desktop. The integration enables Claude to discover, execute, monitor, and cancel Lucky workflows through four MCP tools.

---

## Prerequisites

### System Requirements
- macOS (Claude Desktop currently Mac-only)
- [Claude Desktop](https://claude.ai/download) installed
- Lucky platform running locally or on a server
- Node.js 18+ (for MCP server)

### Lucky Platform Setup
```bash
# 1. Ensure all packages are built
cd /path/to/lucky
bun install
bun run build

# 2. Build the MCP server specifically
cd packages/mcp-server
bun run build

# 3. Start the Lucky web platform
cd ../../apps/web
bun run dev
# Note: Server runs on http://localhost:3000 by default
```

### Get Your API Key
1. Open Lucky in your browser: http://localhost:3000
2. Sign in with your account (Clerk authentication)
3. Navigate to **Settings** → **API Keys**
4. Click **Create New API Key**
5. Give it a name (e.g., "Claude Desktop Integration")
6. Copy the generated API key (starts with `alive_`)
7. **Important**: Store this securely - it won't be shown again

---

## Claude Desktop Configuration

### Step 1: Locate Config File
The Claude Desktop configuration file is at:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

If the file doesn't exist, create it:
```bash
mkdir -p ~/Library/Application\ Support/Claude
touch ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Step 2: Add Lucky MCP Server

Edit `claude_desktop_config.json` and add the Lucky MCP server configuration:

```json
{
  "mcpServers": {
    "lucky": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/lucky/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "LUCKY_API_URL": "http://localhost:3000"
      },
      "session": {
        "luckyApiKey": "alive_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

**Important Configuration Notes:**
- Replace `/ABSOLUTE/PATH/TO/lucky` with your actual Lucky installation path
- Replace `alive_YOUR_API_KEY_HERE` with your actual API key from Step "Get Your API Key"
- For production deployments, change `LUCKY_API_URL` to your production URL
- The `session.luckyApiKey` is how the MCP server authenticates with Lucky

### Step 3: Verify Configuration

1. **Check file syntax**: Ensure your JSON is valid
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python -m json.tool
   ```

2. **Check MCP server path**: Ensure the path exists
   ```bash
   ls -la /ABSOLUTE/PATH/TO/lucky/packages/mcp-server/dist/index.js
   ```

3. **Restart Claude Desktop**: Quit completely (Cmd+Q) and reopen

### Step 4: Verify Tools Are Available

In Claude Desktop, start a new conversation and type:
```
What MCP tools do you have available?
```

Claude should list the Lucky tools:
- `lucky_list_workflows` - List available workflows
- `lucky_run_workflow` - Execute a workflow
- `lucky_check_status` - Check execution status
- `lucky_cancel_workflow` - Cancel a running workflow

If the tools are not visible, check the troubleshooting section below.

---

## Test Scenarios

### Scenario 1: Workflow Discovery ⚡

**Objective**: Verify Claude can discover and list available workflows

**Test Steps:**
1. In Claude Desktop, ask:
   ```
   List my Lucky workflows
   ```

2. **Expected Result:**
   - Claude calls `lucky_list_workflows` tool
   - Returns a list of your workflows
   - Each workflow includes:
     - `workflow_id` (e.g., `wf_research_paper`)
     - `name` (human-readable name)
     - `description` (what the workflow does)
     - `inputSchema` (JSONSchema7 defining required input)
     - `outputSchema` (JSONSchema7 defining expected output)
     - `created_at` (timestamp)

3. **Verification:**
   - ✅ At least one workflow is listed (or demo workflow if none exist)
   - ✅ Workflow IDs start with `wf_`
   - ✅ Input/output schemas are present
   - ✅ Claude can explain what each workflow does

**If you see errors:**
- 401 Unauthorized → Check API key in config
- Empty list → Create a workflow in Lucky web UI first
- Connection error → Verify Lucky platform is running

---

### Scenario 2: Sync Workflow Execution ⚡

**Objective**: Execute a workflow and get immediate results

**Prerequisites**: At least one workflow exists (from Scenario 1)

**Test Steps:**
1. Ask Claude to run a workflow with a short execution time:
   ```
   Run the [workflow_name] workflow with this input: {"message": "Hello, test!"}
   ```

2. **Expected Result:**
   - Claude calls `lucky_run_workflow` with:
     - `workflow_id`: The workflow identifier
     - `input`: Your provided input data
     - `options.timeoutMs`: 30000 (30 seconds for sync mode)
   - Within 30 seconds, Claude receives and displays the output
   - The output matches the workflow's `outputSchema`

3. **Verification:**
   - ✅ Workflow executes successfully
   - ✅ Output is returned immediately (< 30 seconds)
   - ✅ Output format matches expected schema
   - ✅ Claude can interpret and explain the results

**If you see errors:**
- -32001 (Workflow not found) → Check workflow_id is correct
- -32002 (Input validation failed) → Input doesn't match inputSchema
- -32003 (Execution failed) → Check Lucky logs for workflow errors
- -32004 (Timeout) → Workflow took > 30s, try async mode

---

### Scenario 3: Async Workflow Execution with Polling ⚡

**Objective**: Execute a long-running workflow with status polling

**Prerequisites**: A workflow that takes > 30 seconds to complete

**Test Steps:**
1. Ask Claude to run a workflow with explicit async mode:
   ```
   Run the [workflow_name] workflow with timeoutMs set to 60000
   ```

2. **Expected Result (Step 1 - Initiation):**
   - Claude calls `lucky_run_workflow` with `options.timeoutMs: 60000`
   - Receives immediate response with:
     ```json
     {
       "status": "running",
       "invocation_id": "inv_abc123...",
       "meta": { "message": "Workflow started..." }
     }
     ```

3. **Expected Result (Step 2 - Polling):**
   - Claude automatically calls `lucky_check_status` with the invocation_id
   - Polls periodically (every 5-10 seconds)
   - Shows progress updates as they arrive
   - Eventually receives `"state": "completed"` with output

4. **Verification:**
   - ✅ Async invocation returns invocation_id
   - ✅ Claude polls for status automatically
   - ✅ Final output is received when workflow completes
   - ✅ Total execution time matches workflow duration

**Monitoring in Lucky Web UI:**
- Open Lucky web UI → Workflows → [Your Workflow] → Execution History
- Find the running invocation
- Watch real-time logs as Claude polls for updates

---

### Scenario 4: Input Validation Errors 🔍

**Objective**: Verify clear error messages for invalid input

**Test Steps:**
1. Ask Claude to run a workflow with intentionally invalid input:
   ```
   Run the [workflow_name] workflow with input: {"invalid_field": 123}
   ```
   (Assuming "invalid_field" is not in the inputSchema)

2. **Expected Result:**
   - Claude calls `lucky_run_workflow`
   - Receives JSON-RPC error:
     ```json
     {
       "error": {
         "code": -32002,
         "message": "Input validation failed - check the workflow's inputSchema",
         "data": {
           "validationErrors": [
             "Expected field 'message' but got 'invalid_field'"
           ]
         }
       }
     }
     ```

3. **Verification:**
   - ✅ Error code is -32002 (INPUT_VALIDATION_FAILED)
   - ✅ Error message mentions inputSchema
   - ✅ Validation errors are specific and actionable
   - ✅ Claude can explain what input is needed

**Ask Claude to fix it:**
```
What input does this workflow expect?
```
Claude should read the inputSchema and explain the required fields.

---

### Scenario 5: Workflow Not Found Error 🔍

**Objective**: Test error handling for non-existent workflows

**Test Steps:**
1. Ask Claude to run a workflow that doesn't exist:
   ```
   Run workflow wf_nonexistent_12345
   ```

2. **Expected Result:**
   - Receives JSON-RPC error:
     ```json
     {
       "error": {
         "code": -32001,
         "message": "Workflow not found or you don't have access to it"
       }
     }
     ```

3. **Verification:**
   - ✅ Error code is -32001 (WORKFLOW_NOT_FOUND)
   - ✅ Error message is clear
   - ✅ No sensitive information exposed (e.g., database errors)

---

### Scenario 6: Workflow Cancellation 🛑

**Objective**: Cancel a running workflow execution

**Prerequisites**: A workflow that takes > 10 seconds to complete

**Test Steps:**
1. Start a long-running workflow:
   ```
   Run the [long_workflow_name] with timeoutMs 60000
   ```

2. Before it completes, ask Claude to cancel it:
   ```
   Cancel that workflow execution
   ```

3. **Expected Result (Step 1):**
   - Claude calls `lucky_cancel_workflow` with the invocation_id
   - Receives confirmation:
     ```json
     {
       "state": "cancelling",
       "invocationId": "inv_abc123...",
       "cancelRequestedAt": "2025-10-16T11:30:00Z"
     }
     ```

4. **Expected Result (Step 2):**
   - Claude polls status with `lucky_check_status`
   - State changes from "cancelling" → "cancelled"
   - No output is returned (execution was terminated)

5. **Verification:**
   - ✅ Cancellation is acknowledged immediately
   - ✅ State transitions: running → cancelling → cancelled
   - ✅ Workflow execution actually stops (check Lucky logs)
   - ✅ Resources are cleaned up properly

**Monitoring in Lucky:**
- Check execution logs for cancellation signal
- Verify workflow nodes stop executing
- Confirm no hanging processes

---

## Advanced Test Scenarios

### Scenario 7: Trace Debugging 🔬

**Objective**: Use trace mode for detailed execution visibility

**Test Steps:**
1. Ask Claude to run a workflow with trace enabled:
   ```
   Run [workflow_name] with trace: true and show me the detailed execution steps
   ```

2. **Expected Result:**
   - Workflow executes with full tracing
   - Output includes:
     - Node-by-node execution steps
     - Messages passed between nodes
     - Tool calls and results
     - Timestamps for each step
     - Model invocations and token usage

3. **Verification:**
   - ✅ Trace data is comprehensive
   - ✅ Can debug workflow logic from trace
   - ✅ Performance bottlenecks are visible

---

### Scenario 8: Concurrent Executions 🔄

**Objective**: Test multiple concurrent workflow invocations

**Test Steps:**
1. Ask Claude to run the same workflow multiple times simultaneously:
   ```
   Start 3 concurrent executions of [workflow_name] with different inputs:
   1. {"message": "Test 1"}
   2. {"message": "Test 2"}
   3. {"message": "Test 3"}
   ```

2. **Expected Result:**
   - All 3 invocations start immediately
   - Each gets a unique invocation_id
   - All complete successfully (or report individual errors)
   - No interference between executions

3. **Verification:**
   - ✅ All invocations have unique IDs
   - ✅ Results are correctly attributed to inputs
   - ✅ No race conditions or data corruption
   - ✅ Performance is acceptable under load

---

## Expected Behaviors

### Authentication
- **Valid API Key**: All requests succeed
- **Invalid API Key**: 401 Unauthorized error
- **Expired API Key**: 401 Unauthorized error (if expiration implemented)
- **Missing API Key**: 401 Unauthorized error

### Rate Limiting
Currently no rate limiting is enforced. In production, expect:
- **Per-user limits**: e.g., 100 requests/minute
- **Per-workflow limits**: e.g., 10 concurrent executions
- **Burst protection**: Temporary throttling under heavy load

### Error Handling
All errors follow JSON-RPC 2.0 error format:
```json
{
  "error": {
    "code": <integer>,
    "message": "<human-readable description>",
    "data": {<optional additional context>}
  }
}
```

**Error Code Reference:**
- `-32000`: Authentication/authorization errors
- `-32001`: Workflow not found
- `-32002`: Input validation failed
- `-32003`: Workflow execution failed
- `-32004`: Execution timeout
- `-32600`: Invalid JSON-RPC request
- `-32700`: Parse error (malformed JSON)

---

## Troubleshooting

### Tools Not Visible in Claude Desktop

**Symptom**: Claude says "I don't have access to Lucky tools"

**Possible Causes & Solutions:**

1. **Config file not loaded**
   ```bash
   # Check if config exists
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

   # Restart Claude completely
   # Cmd+Q, then reopen
   ```

2. **Invalid JSON syntax**
   ```bash
   # Validate JSON
   python -m json.tool < ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. **Wrong MCP server path**
   ```bash
   # Check path exists
   ls -la /path/to/lucky/packages/mcp-server/dist/index.js

   # Should show: -rwxr-xr-x (executable permission)
   ```

4. **MCP server not built**
   ```bash
   cd /path/to/lucky/packages/mcp-server
   bun run build
   # Should create dist/index.js
   ```

---

### API Key Authentication Errors

**Symptom**: All tool calls return 401 Unauthorized

**Possible Causes & Solutions:**

1. **Wrong API key format**
   - Key should start with `alive_`
   - Example: `alive_sk_abc123def456...`
   - Copy exact key from Lucky Settings (no extra spaces)

2. **API key revoked**
   - Check Settings → API Keys in Lucky web UI
   - Ensure key status is "Active" (not "Revoked")
   - Create a new key if needed

3. **Wrong user account**
   - Ensure API key belongs to the logged-in user
   - Claude can only access workflows owned by the API key's user

4. **Environment mismatch**
   - Verify `LUCKY_API_URL` matches where your Lucky instance runs
   - Localhost: `http://localhost:3000`
   - Production: `https://your-lucky-domain.com`

---

### Workflow Execution Failures

**Symptom**: Workflow starts but fails with -32003 error

**Debugging Steps:**

1. **Check Lucky logs**
   ```bash
   # In terminal where Lucky is running
   # Look for error messages around the invocation time
   ```

2. **Test workflow in Lucky UI**
   - Open Lucky web UI
   - Go to Workflows → [Your Workflow]
   - Click "Test Run"
   - If it fails in UI too, fix the workflow configuration

3. **Check provider API keys**
   - Workflows need API keys for LLM providers (OpenAI, Anthropic, etc.)
   - Verify keys are set in Lucky Settings → Environment Keys
   - Or in `.env.local` file for local development

4. **Inspect workflow DSL**
   - Check node configurations
   - Ensure all required fields are set
   - Verify tool permissions

---

### Connection Timeouts

**Symptom**: Requests hang or timeout after 30 seconds

**Possible Causes:**

1. **Lucky platform not running**
   ```bash
   # Check if Lucky is running
   curl http://localhost:3000/
   # Should return HTML
   ```

2. **Wrong port number**
   - Default is 3000, but Next.js may use 3001+ if 3000 is busy
   - Check terminal where `bun run dev` is running for actual port
   - Update `LUCKY_API_URL` in Claude config if needed

3. **Firewall blocking requests**
   - Check macOS firewall settings
   - Ensure Node.js is allowed to accept incoming connections

4. **Network issues**
   - If using production URL, check internet connection
   - Try pinging the Lucky server: `ping your-lucky-domain.com`

---

### Workflow Output Is Invalid

**Symptom**: Workflow completes but output doesn't match outputSchema

**This is a workflow configuration issue, not an MCP integration issue.**

**Solutions:**
1. Fix the workflow in Lucky web UI
2. Ensure final node's output matches outputSchema
3. Test the workflow directly in Lucky before using via MCP

---

## Performance Expectations

### Response Times

**Workflow Discovery (`lucky_list_workflows`):**
- Expected: < 200ms
- Acceptable: < 1000ms
- Concerning: > 2000ms

**Sync Workflow Execution (`lucky_run_workflow`):**
- Depends on workflow complexity
- Simple workflows: 2-10 seconds
- Complex workflows: 10-30 seconds
- If > 30s, switch to async mode

**Status Check (`lucky_check_status`):**
- Expected: < 100ms
- Acceptable: < 500ms
- This is a database lookup, should be very fast

**Cancellation (`lucky_cancel_workflow`):**
- Request acknowledgment: < 200ms
- Actual cancellation: 1-5 seconds (graceful shutdown)
- Force kill: 5-10 seconds (if workflow doesn't respond)

---

## Test Results Template

Use this template to document your testing results:

```markdown
## Manual Testing Results

**Date**: 2025-10-XX
**Tester**: [Your Name]
**Lucky Version**: [Git commit hash]
**Claude Desktop Version**: [Version number]

### Environment
- Lucky API URL: http://localhost:3000
- API Key: alive_...abc (last 3 chars for reference)
- Test Workflows: [List workflow IDs tested]

### Test Results

#### Scenario 1: Workflow Discovery
- [ ] PASS / [ ] FAIL
- Notes: [Any observations]
- Screenshot: [If applicable]

#### Scenario 2: Sync Execution
- [ ] PASS / [ ] FAIL
- Execution time: [X seconds]
- Notes: [Any observations]

#### Scenario 3: Async Execution
- [ ] PASS / [ ] FAIL
- Polling interval: [X seconds]
- Total time: [X seconds]
- Notes: [Any observations]

#### Scenario 4: Input Validation
- [ ] PASS / [ ] FAIL
- Error message quality: [Clear / Confusing]
- Notes: [Any observations]

#### Scenario 5: Workflow Not Found
- [ ] PASS / [ ] FAIL
- Error handling: [Appropriate / Needs improvement]

#### Scenario 6: Cancellation
- [ ] PASS / [ ] FAIL
- Time to cancel: [X seconds]
- Notes: [Any observations]

### Issues Encountered
[List any bugs, unexpected behaviors, or areas for improvement]

### Overall Assessment
- [ ] Ready for production
- [ ] Needs minor fixes
- [ ] Needs major fixes

### Recommendations
[Any suggestions for improving the integration]
```

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Document results in `manual-testing-results.md`
2. Mark Phase 3 complete in `final-checklist.md`
3. Create deployment plan for production
4. Consider adding automated E2E tests

### If Tests Fail ❌
1. Document failures in detail
2. Create GitHub issues for each bug
3. Prioritize fixes (P0: blocking, P1: important, P2: nice-to-have)
4. Re-test after fixes are deployed

### Production Readiness Checklist
- [ ] All manual test scenarios pass
- [ ] No critical bugs discovered
- [ ] Performance is acceptable
- [ ] Error messages are user-friendly
- [ ] Documentation is complete
- [ ] API keys are secure
- [ ] Rate limiting is implemented (if needed)
- [ ] Monitoring/observability is set up

---

## Additional Resources

- [Phase 1 Documentation](./phase-1-api-endpoints.md) - API endpoint details
- [Phase 2 Documentation](./phase-2-mcp-tools.md) - MCP tool implementation
- [Final Checklist](./final-checklist.md) - Overall project status
- [Claude MCP Documentation](https://docs.anthropic.com/claude/docs/model-context-protocol)

---

## Support

For issues or questions:
- Check existing GitHub issues: https://github.com/eenlars/lucky/issues
- Review Lucky documentation: [Project README](../../README.md)
- Ask in Lucky community channels (if available)

---

**Happy Testing!** 🚀
