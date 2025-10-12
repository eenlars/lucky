-- Migration: Normalize Model IDs to "provider/model" format
-- Date: 2025-10-12
--
-- This migration ensures all enabled_models in provider_settings use the full
-- "provider/model" format (e.g., "openai/gpt-4o") instead of just the model name.
--
-- IMPORTANT: This is a one-way migration. Model IDs should always be stored in
-- the full format going forward. Never parse "/" from model IDs to extract provider -
-- always look up models in MODEL_CATALOG to get the actual API provider.

BEGIN;

-- Normalize all model IDs to "provider/model" format if they don't already have it
UPDATE app.provider_settings
SET enabled_models = (
  SELECT jsonb_agg(
    CASE
      -- If model ID already contains '/', keep it as-is
      WHEN model_id::text LIKE '%/%' THEN model_id
      -- Otherwise, prepend provider name
      ELSE to_jsonb(provider || '/' || replace(model_id::text, '"', ''))
    END
  )
  FROM jsonb_array_elements(enabled_models) AS model_id
)
WHERE enabled_models IS NOT NULL
  AND enabled_models != '[]'::jsonb;

-- Add a constraint to ensure all future model IDs contain a "/"
-- This helps enforce the "provider/model" format at the database level
-- Note: This is a soft constraint - validation is primarily done in application code
ALTER TABLE app.provider_settings
ADD CONSTRAINT enabled_models_format_check
CHECK (
  enabled_models::jsonb IS NULL
  OR enabled_models::jsonb = '[]'::jsonb
  OR (
    SELECT bool_and(value::text ~ '^"[a-z0-9]+/[a-z0-9\.\-]+"$')
    FROM jsonb_array_elements(enabled_models)
  )
);

COMMIT;

-- Verification query (run manually after migration):
-- SELECT provider, enabled_models
-- FROM app.provider_settings
-- WHERE enabled_models IS NOT NULL
-- ORDER BY provider;
