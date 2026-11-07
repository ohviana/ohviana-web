/**
 * Public URLs, inlined at build time by next.config.ts. An unset variable arrives as '' (not
 * undefined), so `??` alone never falls back: `new URL('')` then threw and failed the build.
 */
const configured = (value: string | undefined) => value?.trim().replace(/\/+$/, '') || undefined;

/** The site's own origin when configured (or derived from the Vercel deployment). */
export const CONFIGURED_SITE_URL = configured(process.env.NEXT_PUBLIC_SITE_URL);

/** Absolute origin for canonical URLs, the sitemap and metadata; localhost in development. */
export const SITE_URL = CONFIGURED_SITE_URL ?? 'http://localhost:3000';

/** The Ohviana API (ohviana-apis). */
export const API_BASE_URL =
  configured(process.env.NEXT_PUBLIC_API_BASE_URL) ?? 'http://localhost:4000';
