/**
 * Favicon — uses the user's logo when present, falls back to a generated
 * shield otherwise. Next.js auto-wires this to <link rel="icon">.
 */

import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const size = { width: 64, height: 64 };
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

export default async function Icon() {
  const logo = await loadLogoDataUri();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            logo ? "transparent" : "linear-gradient(135deg, #0b1e4c, #1d4ed8)",
          borderRadius: 12,
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} width={64} height={64} alt="" style={{ objectFit: "contain" }} />
        ) : (
          <div
            style={{
              color: "#facc15",
              fontWeight: 900,
              fontSize: 24,
              fontFamily: "system-ui, sans-serif",
              letterSpacing: -1,
            }}
          >
            RSV
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
