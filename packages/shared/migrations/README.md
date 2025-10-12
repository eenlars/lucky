# Database Migrations

This directory contains SQL migrations for the `app` schema in Supabase.

## Setup Instructions

Run the following SQL files in your Supabase SQL Editor to set up the required database functions:

### 1. Error Logging Trigger (`0001_app_upsert_error.sql`)

Creates a database trigger that automatically increments `total_count` and updates `last_seen` when duplicate errors are upserted. This provides atomic error logging with automatic deduplication.

**Required for:** `/api/log-error` endpoint

**To apply:** Copy the contents of `0001_app_upsert_error.sql` and run it in your Supabase SQL Editor under the SQL section.

## Notes

- These migrations are required for the application to function correctly
- The `app.errors` table must already exist (created via Supabase dashboard or separate migration)
- These functions are scoped to the `app` schema
