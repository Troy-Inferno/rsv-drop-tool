/**
 * Server-only Supabase client (service role).
 *
 * Uses `createClient` with the service-role key. Never expose this client
 * to a browser context.
 */

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

export interface ReminderRequestRow {
  id: string;
  email: string | null;
  rsv_date: string; // YYYY-MM-DD
  timezone: string;
  open_time_utc: string;
  close_time_utc: string;
  noc_check_time_utc: string;
  remind_open: boolean;
  remind_close: boolean;
  remind_noc: boolean;
  open_reminder_sent_at: string | null;
  close_reminder_sent_at: string | null;
  noc_reminder_sent_at: string | null;
  created_at: string;
}

export interface EmailUserRow {
  id: string;
  email: string;
  first_seen_at: string;
  last_seen_at: string;
  source: string;
  unsubscribed_at: string | null;
}

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
