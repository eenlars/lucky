-- Check if workflow exists and who owns it
-- Usage: Run this in Supabase SQL Editor or psql

-- Check the workflow
SELECT
  wf_id,
  clerk_id,
  description,
  created_at,
  updated_at
FROM public."Workflow"
WHERE wf_id = 'wf_058ad0a9';

-- Check if there are any versions
SELECT
  wv.wf_version_id,
  wv.workflow_id,
  wv.created_at,
  w.clerk_id as workflow_owner
FROM public."WorkflowVersion" wv
LEFT JOIN public."Workflow" w ON w.wf_id = wv.workflow_id
WHERE wv.workflow_id = 'wf_058ad0a9';

-- Check the bearer token's clerk_id
SELECT
  clerk_id,
  key_id,
  scopes,
  created_at,
  revoked_at
FROM lockbox.secret_keys
WHERE secret_hash = 'e2148255d4809de1'  -- Replace with your full hash
  AND revoked_at IS NULL;

-- Check RLS policies on Workflow table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'Workflow';
