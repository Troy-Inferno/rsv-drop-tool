/**
 * Twitter card image — reuses the Open Graph render so the two stay in sync.
 * Next.js auto-wires this at /twitter-image for `twitter:image`.
 */

export { default, alt, size, contentType, runtime } from "./opengraph-image";
