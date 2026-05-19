/**
 * Dynamic Open Graph image — rendered as a 1200x630 PNG at request time.
 *
 * Used by:
 *   - Open Graph (Facebook, LinkedIn, WhatsApp, Slack, iMessage)
 *   - Twitter (when `twitter:card = summary_large_image`)
 *
 * If `public/RSV-Drop-Tool-Logo.png` exists, the logo is embedded;
 * otherwise the layout falls back to typography-only without breaking.
 */

import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "RSV Drop Tool — Reserve Drop Window Calculator & Reminder System";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadLogoDataUri(): Promise<string | null> {
  try {
    const file = join(process.cwd(), "public", "RSV-Drop-Tool-Logo.png");
    const buf = await readFile(file);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const logo = await loadLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0b3b8a",
          fontFamily: "system-ui, sans-serif",
          color: "#ffffff",
          padding: "72px 80px",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#fde68a",
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#facc15",
              display: "flex",
            }}
          />
          Reserve Drop Window
        </div>

        {/* Main row */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            gap: 64,
            marginTop: 24,
          }}
        >
          {/* Left: copy */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 96,
                lineHeight: 1.0,
                fontWeight: 800,
                letterSpacing: -2,
              }}
            >
              RSV Drop Tool
            </div>
            <div
              style={{
                fontSize: 38,
                lineHeight: 1.15,
                fontWeight: 600,
                color: "#dbeafe",
                maxWidth: 720,
              }}
            >
              Never miss another RSV drop window.
            </div>
            <div
              style={{
                fontSize: 24,
                lineHeight: 1.4,
                color: "#cbd5e1",
                maxWidth: 720,
              }}
            >
              Calculate your drop request window in your local time zone and get reminded automatically.
            </div>
          </div>

          {/* Right: logo (or shield fallback) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 360,
              height: 360,
              borderRadius: 36,
              background: "rgba(255,255,255,0.06)",
              border: "2px solid #facc15",
              padding: 24,
            }}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                width={304}
                height={304}
                alt="RSV Drop Tool logo"
                style={{ objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 96,
                  fontWeight: 900,
                  color: "#facc15",
                }}
              >
                RSV
              </div>
            )}
          </div>
        </div>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 24,
            fontSize: 22,
            color: "#cbd5e1",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#facc15", fontWeight: 700 }}>by</span>
            <span style={{ color: "#ffffff", fontWeight: 600 }}>Keith Fallon (PVD)</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontSize: 20,
              color: "#a5b4fc",
            }}
          >
            <span>Open · 0900 MT</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>Close · 0900 MT</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>NOC · 1900 MT</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
