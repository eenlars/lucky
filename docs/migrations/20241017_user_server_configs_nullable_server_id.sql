-- Migration: Make server_id nullable in mcp.user_server_configs
-- Purpose: Allow user_server_configs to store stdio-based MCP servers without requiring mcp.servers entry
-- Date: 2024-10-17

-- Drop foreign key constraint
ALTER TABLE mcp.user_server_configs
DROP CONSTRAINT IF EXISTS user_server_configs_server_id_fkey;

-- Make server_id nullable
ALTER TABLE mcp.user_server_configs
ALTER COLUMN server_id DROP NOT NULL;

-- Re-add foreign key constraint (allows NULL)
ALTER TABLE mcp.user_server_configs
ADD CONSTRAINT user_server_configs_server_id_fkey
FOREIGN KEY (server_id)
REFERENCES mcp.servers(server_id)
ON DELETE CASCADE;

-- Add check constraint: stdio configs must have 'command' in config_json
-- Drop if exists first to make migration idempotent
ALTER TABLE mcp.user_server_configs
DROP CONSTRAINT IF EXISTS user_server_configs_stdio_check;

ALTER TABLE mcp.user_server_configs
ADD CONSTRAINT user_server_configs_stdio_check
CHECK (
  server_id IS NOT NULL OR
  (config_json ? 'command')
);

-- Create index for stdio configs (server_id IS NULL)
CREATE INDEX IF NOT EXISTS user_server_configs_stdio_idx
ON mcp.user_server_configs(user_id, name)
WHERE server_id IS NULL AND enabled = true;

-- Add comment
COMMENT ON COLUMN mcp.user_server_configs.server_id IS 'FK to mcp.servers for marketplace servers. NULL for user-defined stdio servers.';
