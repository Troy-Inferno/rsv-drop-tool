/**
 * Server-only env helpers.
 *
 * These should never be imported by client components. Each helper throws
 * a clear error at call time when the variable is missing, so we don't
 * crash the entire app at import time when env vars are partially set
 * (e.g. preview deploys without Resend configured).
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return v;
}

export const env = {
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  resendApiKey: () => required("RESEND_API_KEY"),
  resendFromEmail: () =>
    process.env.RESEND_FROM_EMAIL || "RSV Drop Tool <reminders@example.com>",
  siteUrl: () =>
    (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  cronSecret: () => required("CRON_SECRET"),
  adminExportToken: () => required("ADMIN_EXPORT_TOKEN"),
  unsubscribeSecret: () =>
    process.env.UNSUBSCRIBE_SECRET || required("CRON_SECRET"),
};

/** Returns true if Supabase is configured. Used to short-circuit
 *  reminder writes / queries when running locally without a DB. */
export function hasSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Returns true if Resend is configured. */
export function hasResend(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
