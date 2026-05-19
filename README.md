# RSV Drop Tool

**Reserve Drop Window Calculator & Reminder System**
by Keith Fallon (PVD)

> Never miss another RSV drop window. Enter your RSV day, choose your time zone, and get reminded when your drop window opens.

---

## What this is

A "set it and forget it" web utility for airline reserve flight attendants. Given an RSV date and the user's IANA time zone, it computes the drop request window and the NOC check time, displays a live status badge, and (optionally) emails reminders.

### Business rules

- **Window opens:** 0900 Mountain Time, 48 hours before the RSV day.
- **Window closes:** 0900 Mountain Time, 24 hours before the RSV day.
- **NOC processing:** by 1900 Mountain Time the evening before the RSV day.
- Crew Scheduling does **not** notify reserves of the result. Users must verify in NOC.

All time math is done with [Luxon](https://moment.github.io/luxon/) against `America/Denver`. No UTC offsets are ever hardcoded.

---

## Sharing previews (Open Graph + Twitter + WhatsApp + iMessage)

The app generates a beautiful 1200×630 PNG share card on the fly:

- `/opengraph-image` — used by Facebook, LinkedIn, WhatsApp, Slack, iMessage, etc.
- `/twitter-image` — used for `summary_large_image` Twitter cards.
- `/icon` (favicon) and `/apple-icon` (180×180) — both pull from the logo.

All four routes embed `public/RSV-Drop-Tool-Logo.png` when present and fall back gracefully if it isn't. Test your share card with:

- <https://www.opengraph.xyz/>
- <https://cards-dev.twitter.com/validator>
- WhatsApp / iMessage: paste the URL into a chat.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + shadcn-style UI primitives
- **Luxon** for all timezone-sensitive calculations
- **Supabase (Postgres)** for reminder/email storage
- **Resend** for transactional email
- **Vercel Cron** for the reminder runner

---

## Local setup

```bash
# 1. Install
npm install

# 2. Copy env template and fill in values
cp .env.example .env.local

# 3. Drop the logo into /public (used by header, favicon, and OG images)
cp "$HOME/Desktop/RSV Drop Tool/RSV-Drop-Tool-Logo.png" public/

# 4. Run dev server
npm run dev
```

Open <http://localhost:3000>.

You can use the calculator UI without setting up Supabase/Resend. The
form will compute and display the drop window. Reminder emails and
persistence are skipped when those env vars are missing.

---

## Environment variables

| Variable                     | Required for                 | Notes                                                                 |
|------------------------------|------------------------------|-----------------------------------------------------------------------|
| `SUPABASE_URL`               | Reminders + email signups    | `https://<project-ref>.supabase.co`                                   |
| `SUPABASE_SERVICE_ROLE_KEY`  | Reminders + email signups    | **Server-only.** Never expose to the browser.                         |
| `RESEND_API_KEY`             | Sending reminder emails      | From <https://resend.com/api-keys>                                    |
| `RESEND_FROM_EMAIL`          | Sending reminder emails      | e.g. `RSV Drop Tool <reminders@your-domain.com>`. Domain must be verified in Resend. |
| `NEXT_PUBLIC_SITE_URL`       | Unsubscribe links in emails  | e.g. `https://rsv-drop.example.com`                                   |
| `CRON_SECRET`                | `/api/cron/send-reminders`   | Long random string. Vercel Cron sends it as `Authorization: Bearer`.  |
| `ADMIN_EXPORT_TOKEN`         | `/api/admin/export`          | Long random string. Used as `?token=` or `Authorization: Bearer`.     |
| `UNSUBSCRIBE_SECRET`         | Unsubscribe link HMAC        | Optional; defaults to `CRON_SECRET` if unset.                         |

---

## Supabase setup

1. Create a project at <https://supabase.com>.
2. Open the SQL editor and run [`supabase/schema.sql`](./supabase/schema.sql). This creates the `reminder_requests` and `email_users` tables and the indexes the cron uses.
3. Project Settings → API → grab the **service role** key (not the anon key). RLS is enabled on both tables; only the service-role key (used server-side) can read or write them.
4. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (locally) and in your Vercel project env (production).

If you ever want to inspect data without the admin endpoint, use the Supabase Table Editor.

---

## Resend setup

1. Create an account at <https://resend.com>.
2. Add and verify the sending domain you want to use (DNS / SPF / DKIM / DMARC).
3. Create an API key.
4. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (e.g. `RSV Drop Tool <reminders@your-domain.com>`).

Each reminder email includes:

- RSV date
- Window open / close / NOC check times in the user's local zone **and** in Mountain Time
- A "check NOC" reminder
- "RSV Drop Tool by Keith Fallon (PVD)" branding
- A one-click unsubscribe link (HMAC-signed, RFC 8058 compatible header)

---

## Vercel deployment

1. Push this repo to GitHub.
2. Import the project at <https://vercel.com/new>.
3. Add the env vars listed above to **Production** (and **Preview** if you want).
4. Deploy.

### Cron

The repo ships a [`vercel.json`](./vercel.json) that runs the reminder dispatcher every 5 minutes:

```json
{
  "crons": [
    { "path": "/api/cron/send-reminders", "schedule": "*/5 * * * *" }
  ]
}
```

Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET`. The endpoint will reject requests without the correct secret.

You can also trigger the endpoint manually:

```bash
curl "https://your-domain.com/api/cron/send-reminders?secret=YOUR_CRON_SECRET"
```

The endpoint returns JSON describing how many reminders it attempted/sent/skipped.

---

## API surface

| Route                              | Method | Purpose                                                  |
|------------------------------------|--------|----------------------------------------------------------|
| `/api/reminders`                   | POST   | Save a reminder request and/or record an email signup    |
| `/api/cron/send-reminders`         | GET    | Vercel Cron handler — sends due emails, marks `sent_at`  |
| `/api/ics?rsvDate=YYYY-MM-DD&events=open,close_warning,noc` | GET | Download an `.ics` for one or more events |
| `/api/unsubscribe?token=…`         | GET/POST | Unsubscribe an email (one-click compatible)            |
| `/api/admin/export?token=…&table=reminder_requests` | GET | CSV export (admin)                            |
| `/api/admin/export?token=…&table=email_users`       | GET | CSV export (admin)                            |

The cron uses `*_reminder_sent_at` columns to prevent duplicate sends and `email_users.unsubscribed_at` to skip unsubscribed addresses.

---

## Calendar integration

The Result card offers three buttons:

- **Download .ics (all 3 events)** — Window open, 1h-before-close, NOC check. Works with Apple Calendar, Outlook, and most Android calendar apps.
- **Add to Google Calendar** — Opens the Google Calendar "add event" template for the window-open event.
- **Apple Calendar (.ics)** — Convenience download of just the window-open event.

All `.ics` events are emitted in UTC, so calendar apps render them in the user's local zone with no VTIMEZONE blocks required.

---

## Project layout

```
src/
  app/
    layout.tsx                    # Root layout
    page.tsx                      # Home (calculator + sidebar)
    globals.css                   # Tailwind + status badge styles
    api/
      reminders/route.ts          # POST — save reminder
      ics/route.ts                # GET  — download .ics
      cron/send-reminders/route.ts# GET  — Vercel Cron
      unsubscribe/route.ts        # GET/POST — unsubscribe
      admin/export/route.ts       # GET  — CSV export
  components/
    CalculatorForm.tsx
    TimingCard.tsx
    StatusBadge.tsx
    Countdown.tsx
    CalendarButtons.tsx
    ui/                           # shadcn-style primitives
  lib/
    rsv.ts                        # Window math, status, countdowns
    timezones.ts                  # State → IANA mapping
    calendar.ts                   # .ics + Google Calendar
    email.ts                      # Resend + HTML templates
    unsubscribe.ts                # HMAC-signed unsubscribe tokens
    db.ts                         # Supabase service-role client
    env.ts                        # Env loaders (server)
    validation.ts                 # Zod schemas
    utils.ts                      # cn() helper
supabase/
  schema.sql                      # One-time DB setup
vercel.json                       # Cron config
```

---

## Future expansion

Already accommodated by the architecture:

- PBS tools
- Reserve legality calculators
- Airline-specific rule sets
- SMS reminders (drop in another sender alongside Resend)
- Push notifications
- Reserve block imports
- Other crew scheduling utilities

The reminder dispatcher is a clean separation: any new reminder type just needs a new bucket query, a new `sent_at` column, and a new template.

---

## Disclaimer

This tool is informational only. It does not replace company policy or
NOC. The user is responsible for verifying all company policies and
NOC updates themselves.
