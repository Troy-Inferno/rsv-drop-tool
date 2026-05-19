-- RSV Drop Tool — Supabase schema
-- Run this once in the Supabase SQL editor for a new project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- reminder_requests
-- ---------------------------------------------------------------------------
create table if not exists public.reminder_requests (
  id                       uuid primary key default gen_random_uuid(),
  email                    text,
  rsv_date                 date not null,
  timezone                 text not null,
  open_time_utc            timestamptz not null,
  close_time_utc           timestamptz not null,
  noc_check_time_utc       timestamptz not null,
  remind_open              boolean not null default false,
  remind_close             boolean not null default false,
  remind_noc               boolean not null default false,
  open_reminder_sent_at    timestamptz,
  close_reminder_sent_at   timestamptz,
  noc_reminder_sent_at     timestamptz,
  created_at               timestamptz not null default now()
);

create index if not exists reminder_requests_email_idx
  on public.reminder_requests (email);
create index if not exists reminder_requests_open_due_idx
  on public.reminder_requests (open_time_utc)
  where remind_open = true and open_reminder_sent_at is null;
create index if not exists reminder_requests_close_due_idx
  on public.reminder_requests (close_time_utc)
  where remind_close = true and close_reminder_sent_at is null;
create index if not exists reminder_requests_noc_due_idx
  on public.reminder_requests (noc_check_time_utc)
  where remind_noc = true and noc_reminder_sent_at is null;

-- ---------------------------------------------------------------------------
-- email_users
-- ---------------------------------------------------------------------------
create table if not exists public.email_users (
  id                uuid primary key default gen_random_uuid(),
  email             text unique not null,
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  source            text not null default 'RSV Drop Tool',
  unsubscribed_at   timestamptz
);

create index if not exists email_users_unsub_idx
  on public.email_users (unsubscribed_at);

-- ---------------------------------------------------------------------------
-- rate_limits
-- Stores one row per form submission, keyed by client IP, so the reminder
-- API can enforce a per-IP cap (e.g. "no more than N submissions per hour").
-- Rows older than the throttle window are effectively ignored; you can
-- periodically clean them up if growth becomes an issue, but they're tiny.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  id            bigserial primary key,
  ip            text        not null,
  attempted_at  timestamptz not null default now()
);

create index if not exists rate_limits_ip_time_idx
  on public.rate_limits (ip, attempted_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- We never expose these tables to the anon role. All access is from the
-- server using the service role key, so we enable RLS and add no policies.
-- ---------------------------------------------------------------------------
alter table public.reminder_requests enable row level security;
alter table public.email_users        enable row level security;
alter table public.rate_limits        enable row level security;
