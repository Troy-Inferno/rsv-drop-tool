import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { checkAdminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

interface SearchParams {
  error?: string;
}

export default async function AdminLoginPage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  if (await checkAdminAuth()) {
    redirect("/admin");
  }
  const hasError = searchParams?.error === "1";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">RSV Drop Tool Admin</h1>
            <p className="text-xs text-muted-foreground">Authorized access only</p>
          </div>
        </div>

        <form method="POST" action="/api/admin/login" className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Admin token
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              required
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground">
              The same long random string set as <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">ADMIN_EXPORT_TOKEN</code> in your Vercel env vars.
            </p>
          </div>

          {hasError && (
            <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              Invalid token. Try again.
            </p>
          )}

          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
