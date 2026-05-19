import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const TITLE = "RSV Drop Tool — Reserve Drop Window Calculator & Reminder System";
const SHORT_TITLE = "RSV Drop Tool";
const DESCRIPTION =
  "Never miss another RSV drop window. Enter your RSV day, choose your time zone, and get reminded when your drop window opens. By Keith Fallon (PVD).";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · RSV Drop Tool",
  },
  description: DESCRIPTION,
  applicationName: SHORT_TITLE,
  authors: [{ name: "Keith Fallon" }],
  keywords: [
    "RSV",
    "reserve drop",
    "flight attendant",
    "airline reserve",
    "crew scheduling",
    "drop window",
    "NOC",
    "Keith Fallon",
  ],
  category: "productivity",
  creator: "Keith Fallon (PVD)",
  publisher: "Keith Fallon (PVD)",
  // Next.js will auto-merge the file-based icon.tsx / apple-icon.tsx.
  // Listing them here also makes them explicit + crawl-friendly.
  openGraph: {
    type: "website",
    siteName: SHORT_TITLE,
    locale: "en_US",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    // Next will auto-add the dynamic /opengraph-image, but we add an
    // explicit entry so the absolute URL + alt + dimensions show up in
    // crawlers that don't follow the file-based convention.
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "RSV Drop Tool — Reserve Drop Window Calculator & Reminder System",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/twitter-image",
        width: 1200,
        height: 630,
        alt: "RSV Drop Tool — by Keith Fallon (PVD)",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  // Note: we intentionally do NOT add `other:` overrides for
  // og:image:secure_url, og:image:type, or theme-color. Next.js already
  // emits the correct property="og:image" with an HTTPS URL and the
  // proper property="og:image:type" tag, and viewport.themeColor below
  // emits theme-color. Adding them again via `other:` would either
  // duplicate them or emit them with name="..." instead of property="..."
  // which is not OG-spec compliant.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b3b8a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
