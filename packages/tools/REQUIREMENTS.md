# Tool System Requirements

## Architecture

### Module Structure

- `/shared` - Common utilities and types
- `/mcp` - MCP tool integration (external process tools)
- `/custom` - Custom code tools (TypeScript function tools)
- `/validation` - Validation logic for tool registration and configuration

**Rationale**: MCP and custom tools differ significantly in startup and usage patterns, requiring separate handling.

## Registration

### Startup-Only Registration

- Tools are registered at application startup only
- No runtime registration/unregistration after initialization
- Workflows cannot run before tools are registered

### Manual Registration

- Remove auto-discovery from filesystem
- Manual registration via explicit API calls
- Configuration-driven registration

### Adapter Pattern for Remote Sources

- Support remote/API-based tool registration via adapters
- Adapter selection via configuration
- Keep architecture open for future adapter implementations

## Validation

### Immediate Validation

- Validate tool registration at startup
- Throw immediately if validation fails
- No graceful fallbacks or silent failures

### MCP-Specific Validation

- Validate MCP server configuration
- Validate connection capabilities
- Ensure MCP tools are available before marking as registered

## Configuration

### Single Configuration Point

- Configuration provided once at initialization
- All tool availability determined from configuration
- Environment-specific tool sets (dev/staging/prod) via configuration

### Flexible & Generic Design

- Invocation pipeline must be generic and interface-based
- Clear interfaces for all major components
- Settings and pipeline handling must be changeable
- Architecture must support evolution without breaking changes

## Multi-Tenancy & Isolation

### Per-Workflow Tool Instances

- Each workflow instance has a separate tool system
- Tools are NOT shared function references between workflows
- Each workflow gets its own tool instances

### Registry & Selection Model

- Users/contexts can have one registry of available tools
- Workflows select a subset of tools from the registry
- Selected tools are instantiated separately per workflow

### Safety

- Tool isolation prevents cross-workflow interference
- Registry-based selection provides central control

## Type Safety

### No Type-Based Tool Names

- Remove `CodeToolName` type constraints
- Tool names are runtime strings, not TypeScript types
- TypeScript types should not dictate runtime availability

## Performance

### Frontend Compatibility

- Tools must be executable quickly from frontend
- Registration and invocation must be performant
- Frontend tooling should have clear, fast APIs

## Out of Scope (Future Work)

### Observability (Later)

- Health checks for tool availability
- Runtime diagnostics and introspection
- Tool usage metrics

**Current Focus**: Make tools run effectively and correctly. Observability comes after core functionality is solid.
