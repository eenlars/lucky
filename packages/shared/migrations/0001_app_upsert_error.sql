-- Automatic error count increment via trigger
-- This trigger automatically increments total_count and updates last_seen
-- when an error with the same hash is inserted (triggering ON CONFLICT DO UPDATE)

-- First, create a trigger function that will be called on INSERT or UPDATE
CREATE OR REPLACE FUNCTION app.auto_increment_error_count()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is an UPDATE from a conflict resolution (same hash, total_count=1 in NEW)
  -- then increment the counter. This guards against regular UPDATEs that edit other fields.
  IF TG_OP = 'UPDATE' AND NEW.hash = OLD.hash AND NEW.total_count = 1 THEN
    NEW.total_count := OLD.total_count + 1;
    NEW.last_seen := now();
  END IF;
  -- If this is an INSERT, use the provided values (total_count = 1, last_seen = now())
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger that calls this function BEFORE INSERT OR UPDATE
DROP TRIGGER IF EXISTS auto_increment_error_count_trigger ON app.errors;
CREATE TRIGGER auto_increment_error_count_trigger
  BEFORE INSERT OR UPDATE ON app.errors
  FOR EACH ROW
  EXECUTE FUNCTION app.auto_increment_error_count();
