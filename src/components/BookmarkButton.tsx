"use client";

import { useEffect, useState } from "react";
import { Bookmark, Smartphone } from "lucide-react";

/**
 * "Bookmark this site" / "Add to favorites" button.
 *
 * Modern browsers (Chrome 14+, Firefox, Safari, Edge) all disabled the
 * JavaScript bookmark API for security reasons — there is NO way for a
 * web page to programmatically add itself to favorites. The most a site
 * can do is tell the user the right keystroke for their platform.
 *
 * So this component detects the user's OS + device class and pops a
 * platform-appropriate instruction when clicked:
 *
 *   - macOS (any browser)            → press ⌘D
 *   - Windows / Linux (any browser)  → press Ctrl+D
 *   - iPhone / iPad (Safari)         → tap Share, then Add Bookmark / Add to Home Screen
 *   - Android (Chrome)               → tap menu (⋮), then Add to Home Screen
 */
export function BookmarkButton() {
  const [hint, setHint] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"mac" | "win" | "ios" | "android" | "other">("other");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) setPlatform("ios");
    else if (/Android/.test(ua)) setPlatform("android");
    else if (/Mac/.test(ua)) setPlatform("mac");
    else if (/Win/.test(ua)) setPlatform("win");
    else setPlatform("other");
  }, []);

  function handleClick() {
    let message: string;
    switch (platform) {
      case "mac":
        message = "Press ⌘ + D to bookmark this page.";
        break;
      case "win":
        message = "Press Ctrl + D to bookmark this page.";
        break;
      case "ios":
        message = "Tap the Share button, then choose Add Bookmark or Add to Home Screen.";
        break;
      case "android":
        message = "Tap the menu (⋮) in your browser, then choose Add to Home Screen or Add Bookmark.";
        break;
      default:
        message = "Press Ctrl + D (or ⌘ + D on Mac) to bookmark this page.";
    }
    setHint(message);
    // Auto-dismiss after 10 seconds
    setTimeout(() => setHint(null), 10000);
  }

  const isMobile = platform === "ios" || platform === "android";

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          {isMobile ? <Smartphone className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
        </div>

        <div className="flex-1">
          <div className="text-sm font-semibold">Save this site for next time</div>
          <div className="text-xs text-muted-foreground">
            Bookmark it so you can set reminders for future RSV days in one tap.
          </div>
        </div>

        <button
          type="button"
          onClick={handleClick}
          className="inline-flex h-10 items-center gap-2 self-start rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground sm:self-center"
        >
          <Bookmark className="h-4 w-4" />
          {isMobile ? "Save to Home Screen" : "Add to Favorites"}
        </button>
      </div>

      {hint && (
        <div
          role="status"
          className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {hint}
        </div>
      )}
    </div>
  );
}
