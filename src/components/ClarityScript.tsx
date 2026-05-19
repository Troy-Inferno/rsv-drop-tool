"use client";

import Script from "next/script";

/**
 * Microsoft Clarity analytics.
 *
 * Reads the project ID from `NEXT_PUBLIC_CLARITY_ID`. When the env var
 * is missing (e.g. local dev, preview deploys without analytics) the
 * component renders nothing — no tracking script ships.
 *
 * Loading strategy: `afterInteractive`. Clarity itself is async and
 * heavily optimized, but we still defer it until after the page is
 * interactive so it never blocks user input.
 */
export function ClarityScript() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_ID;
  if (!projectId) return null;
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${projectId}");`}
    </Script>
  );
}
