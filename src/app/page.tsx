import Image from "next/image";
import { ShieldAlert } from "lucide-react";
import { CalculatorForm } from "@/components/CalculatorForm";
import { AudioIntro } from "@/components/AudioIntro";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/RSV-Drop-Tool-Logo.png"
              alt="RSV Drop Tool logo"
              width={48}
              height={48}
              priority
              className="h-12 w-12 rounded-lg object-contain"
            />
            <div>
              <h1 className="text-lg font-bold leading-tight">RSV Drop Tool</h1>
              <p className="text-xs text-muted-foreground">by Keith Fallon (PVD)</p>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reserve Drop Window
            </p>
            <p className="text-xs text-muted-foreground">Calculator &amp; Reminder System</p>
          </div>
        </div>
      </header>

      <main className="container py-8 sm:py-12">
        <section className="mb-8 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Never miss another RSV drop window.
          </h2>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Enter your RSV day, choose your time zone, and get reminded when your drop window opens.
          </p>
        </section>

        <div className="mb-6 max-w-3xl">
          <AudioIntro />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CalculatorForm />
          </div>
          <aside className="space-y-4">
            <RulesCard />
            <DisclaimerCard />
          </aside>
        </div>

        <footer className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
          <p>RSV Drop Tool · Reserve Drop Window Calculator &amp; Reminder System</p>
          <p className="mt-1">by Keith Fallon (PVD)</p>
        </footer>
      </main>
    </div>
  );
}

function RulesCard() {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        How the window works
      </h3>
      <ul className="mt-3 space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <div>
            <div className="font-medium">Window opens</div>
            <div className="text-muted-foreground">0900 Mountain Time, 48h before RSV day</div>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-amber-500" />
          <div>
            <div className="font-medium">Window closes</div>
            <div className="text-muted-foreground">0900 Mountain Time, 24h before RSV day</div>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
          <div>
            <div className="font-medium">NOC processing</div>
            <div className="text-muted-foreground">
              By 1900 Mountain Time the evening before. Check NOC — Crew Scheduling will not contact you.
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}

function DisclaimerCard() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
        <div className="text-amber-900">
          <p className="font-semibold">Informational only.</p>
          <p className="mt-1">
            This tool helps you track timing — it does not replace company policy. You must verify all
            company policies and NOC updates yourself.
          </p>
        </div>
      </div>
    </div>
  );
}
