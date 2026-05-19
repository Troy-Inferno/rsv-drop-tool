/**
 * Resend email composition + send helpers.
 *
 * Each reminder email shares the same layout: RSV date, the three key
 * moments rendered in both Mountain Time and the recipient's local zone,
 * a reminder to verify in NOC, branding, and an unsubscribe link.
 */

import "server-only";
import { Resend } from "resend";
import { env } from "./env";
import { computeWindowInZone, formatInZone, type RsvWindow } from "./rsv";
import { buildUnsubscribeUrl } from "./unsubscribe";
import { SOURCE_TZ } from "./timezones";

export type ReminderEmailKind = "open" | "close" | "noc";

const SUBJECTS: Record<ReminderEmailKind, string> = {
  open: "RSV Drop Window Open",
  close: "RSV Drop Window Closing Soon",
  noc: "Time to Check NOC",
};

const HEADLINES: Record<ReminderEmailKind, string> = {
  open: "Your RSV drop request window is open.",
  close: "Your RSV drop request window closes within 1 hour.",
  noc: "Time to check NOC for your RSV drop result.",
};

const LEADS: Record<ReminderEmailKind, string> = {
  open: "Submit your drop request now if you want to drop this RSV day. The window closes at 0900 Mountain Time tomorrow.",
  close: "Last chance — submit your drop request now if you still want to drop this RSV day. The window closes at 0900 Mountain Time.",
  noc: "Drop requests are processed by 1900 Mountain Time the evening before the RSV day. Check NOC for your result — Crew Scheduling will not contact you.",
};

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface RenderArgs {
  kind: ReminderEmailKind;
  email: string;
  rsvDate: string;       // YYYY-MM-DD
  timezone: string;      // IANA
}

export function renderReminderEmail(args: RenderArgs): RenderedEmail {
  const { kind, email, rsvDate, timezone } = args;
  const w = computeWindowInZone(rsvDate, timezone);

  const local = {
    open: formatInZone(w.openUtc, timezone),
    close: formatInZone(w.closeUtc, timezone),
    noc: formatInZone(w.nocCheckUtc, timezone),
  };
  const mt = {
    open: formatInZone(w.openUtc, SOURCE_TZ),
    close: formatInZone(w.closeUtc, SOURCE_TZ),
    noc: formatInZone(w.nocCheckUtc, SOURCE_TZ),
  };

  const unsubscribeUrl = buildUnsubscribeUrl(email);

  const subject = SUBJECTS[kind];
  const headline = HEADLINES[kind];
  const lead = LEADS[kind];

  const text = [
    `${headline}`,
    "",
    lead,
    "",
    `RSV date: ${rsvDate}`,
    "",
    `Drop window opens:`,
    `  ${local.open.date} ${local.open.time} ${local.open.zoneAbbr} (${timezone})`,
    `  ${mt.open.date} ${mt.open.time} ${mt.open.zoneAbbr} (Mountain Time)`,
    "",
    `Drop window closes:`,
    `  ${local.close.date} ${local.close.time} ${local.close.zoneAbbr} (${timezone})`,
    `  ${mt.close.date} ${mt.close.time} ${mt.close.zoneAbbr} (Mountain Time)`,
    "",
    `Check NOC after:`,
    `  ${local.noc.date} ${local.noc.time} ${local.noc.zoneAbbr} (${timezone})`,
    `  ${mt.noc.date} ${mt.noc.time} ${mt.noc.zoneAbbr} (Mountain Time)`,
    "",
    "Crew Scheduling will NOT notify you. You must verify the result yourself in NOC.",
    "",
    "—",
    "RSV Drop Tool by Keith Fallon (PVD)",
    "Informational only. Verify all company policies and NOC updates yourself.",
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr><td style="background:#0b3b8a;color:#ffffff;padding:20px 24px;">
            <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.85;">RSV Drop Tool</div>
            <div style="font-size:20px;font-weight:700;margin-top:4px;">${escapeHtml(subject)}</div>
          </td></tr>
          <tr><td style="padding:24px;">
            <div style="font-size:18px;font-weight:600;margin-bottom:8px;">${escapeHtml(headline)}</div>
            <div style="font-size:14px;line-height:1.55;color:#334155;margin-bottom:18px;">${escapeHtml(lead)}</div>

            <div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:14px;">
              <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">RSV Date</div>
              <div style="font-size:16px;font-weight:600;">${escapeHtml(rsvDate)}</div>
            </div>

            ${row("Drop window opens", local.open, mt.open, timezone)}
            ${row("Drop window closes", local.close, mt.close, timezone)}
            ${row("Check NOC after", local.noc, mt.noc, timezone)}

            <div style="margin-top:18px;padding:12px 14px;background:#fef9c3;border:1px solid #fde68a;border-radius:10px;color:#854d0e;font-size:13px;line-height:1.45;">
              Crew Scheduling will <strong>not</strong> notify you. You must verify the result yourself in NOC.
            </div>

            <div style="margin-top:24px;font-size:12px;color:#64748b;line-height:1.5;">
              RSV Drop Tool by Keith Fallon (PVD). Informational only — verify all company policies and NOC updates yourself.
            </div>
            <div style="margin-top:10px;font-size:12px;">
              <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

function row(
  label: string,
  local: { date: string; time: string; zoneAbbr: string },
  mt: { date: string; time: string; zoneAbbr: string },
  tz: string,
): string {
  return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:10px;">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">${escapeHtml(label)}</div>
    <div style="font-size:15px;font-weight:600;">${escapeHtml(local.date)} · ${escapeHtml(local.time)} ${escapeHtml(local.zoneAbbr)}</div>
    <div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtml(tz)}</div>
    <div style="margin-top:8px;font-size:13px;color:#334155;">Mountain Time: ${escapeHtml(mt.date)} · ${escapeHtml(mt.time)} ${escapeHtml(mt.zoneAbbr)}</div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(env.resendApiKey());
  return _resend;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendReminderEmail(args: RenderArgs): Promise<SendResult> {
  const { subject, html, text } = renderReminderEmail(args);
  const unsubscribeUrl = buildUnsubscribeUrl(args.email);
  try {
    const result = await getResend().emails.send({
      from: env.resendFromEmail(),
      to: [args.email],
      subject,
      html,
      text,
      headers: {
        // RFC 8058 / RFC 2369 one-click unsubscribe
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, id: result.data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Suitable for unit testing / preview without hitting Resend. */
export function renderReminderForPreview(args: RenderArgs): RenderedEmail {
  return renderReminderEmail(args);
}
