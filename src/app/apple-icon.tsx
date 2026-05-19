/**
 * Apple touch icon (180×180). Mirrors the favicon design at a larger size.
 */

import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
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

export default async function AppleIcon() {
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
            "linear-gradient(135deg, #0b1e4c 0%, #0b3b8a 55%, #1d4ed8 100%)",
          borderRadius: 36,
          padding: 14,
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} width={152} height={152} alt="" style={{ objectFit: "contain" }} />
        ) : (
          <div
            style={{
              color: "#facc15",
              fontWeight: 900,
              fontSize: 72,
              letterSpacing: -3,
              fontFamily: "system-ui, sans-serif",
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
