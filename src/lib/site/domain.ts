/**
 * Resolve the site's canonical base URL from environment variables.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL — explicit env var (set by Vercel on cutover)
 * 2. NEXT_PUBLIC_VERCEL_URL — auto-Vercel domain без protocol (fallback для preview)
 * 3. 'https://studio.pnhd.ru' — final fallback (production canonical)
 *
 * Closes audit W-SEO-01 — earlier the domain was hardcoded as 'studio.pnhd.ru'
 * (original site's domain), causing canonical/og:url/JSON-LD `url` fields to
 * point at a third-party site → current Vercel deployment effectively de-indexed.
 */
export const resolveDomain = (): string => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return 'https://studio.pnhd.ru';
};
