import type { Metadata } from "next";

/** Hide /admin/* from search engines and OG crawlers. */
export const metadata: Metadata = {
  title: "Admin · RSV Drop Tool",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
