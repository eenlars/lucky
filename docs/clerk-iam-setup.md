# Clerk + IAM Integration Checklist

Use this guide to ensure Clerk authentication is fully wired and the `iam.users` table stays in sync.

## 1) Environment variables

Set these in `apps/web/.env` (see `.env.example` for placeholders):

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET` (from Clerk dashboard > Webhooks > signing secret)
- Supabase: either
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or
  - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (preferred for server webhooks)

## 2) Next.js middleware

The middleware protects all routes by default and explicitly allows public ones. Ensure the Clerk webhook route stays public:

```
/api/clerk/webhooks
```

Already configured in `apps/web/src/middleware.ts`.

## 3) Clerk webhook configuration

In the Clerk dashboard:

- Add a webhook endpoint pointing to your app: `https://<domain>/api/clerk/webhooks` (or `http://localhost:3000/api/clerk/webhooks` in dev)
- Subscribe to events: `user.created`, `user.updated`, `user.deleted`
- Copy the signing secret and set `CLERK_WEBHOOK_SECRET`

The handler verifies the signature and upserts into `iam.users`.

## 4) Supabase schema (IAM)

Run the following SQL in your Supabase SQL editor (or migrations) to provision the IAM schema, enum, table, and indexes:

```sql
-- Schema
create schema if not exists iam;

-- Enum for user status
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='iam' and t.typname='user_status') then
    create type iam.user_status as enum ('active', 'disabled', 'invited');
  end if;
end $$;

-- Users table
create table if not exists iam.users (
  user_id text primary key default public.gen_prefixed_id('usr'),
  email text,
  display_name text,
  avatar_url text,
  status iam.user_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  clerk_id text not null
);

-- Uniqueness on Clerk id is required for upsert(on conflict)
create unique index if not exists iam_users_clerk_id_key on iam.users (clerk_id);

-- Helpful index for lookups by email
create index if not exists iam_users_email_idx on iam.users (email);

-- Updated-at trigger (optional)
create or replace function iam.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists iam_users_set_updated_at on iam.users;
create trigger iam_users_set_updated_at before update on iam.users
for each row execute function iam.set_updated_at();
```

If you use RLS, ensure the webhook uses `SUPABASE_SERVICE_ROLE_KEY` and add policies as needed.

## 5) Validation

1. Start the app and sign up/in via Clerk
2. Trigger a user update (e.g., change name or avatar) in Clerk
3. Confirm `iam.users` row exists/updates in Supabase (check `clerk_id`, `email`, `display_name`, `avatar_url`, `status`)
4. Delete the user in Clerk and verify the row is marked `disabled`

## Notes

- Server-side code prefers `SUPABASE_SERVICE_ROLE_KEY` for webhook upsert reliability
- In local dev, if webhooks cannot reach your machine, you can temporarily sync manually using a small authenticated endpoint that calls `syncIamUser(userId)`

