import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { PublicSitemap } from '@ohviana/contracts';
import { apiFetch } from '@/lib/api';
import { SITE_URL } from '@/lib/env';

/** The API's list is cached for an hour; a crawler never waits on more than one slow call. */
const REVALIDATE_S = 3600;
const TIMEOUT_MS = 8000;

/**
 * Indexable pages only: listing a noindex page (about, terms, search…) earns a "Submitted URL
 * marked noindex" error in Search Console. Trek and organizer pages come from one API call.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Built per request, never at `next build`: the build must not depend on the API being up.
  await connection();
  const pages = await apiFetch('/v1/sitemap', PublicSitemap, {
    next: { revalidate: REVALIDATE_S },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((err: unknown) => {
    // Still serve the static pages; Google keeps already-known URLs until the next read.
    console.error('sitemap: API unavailable, serving static pages only', err);
    return { treks: [], organizers: [] };
  });

  const newest = [...pages.treks, ...pages.organizers].reduce<string | undefined>(
    (max, e) => (!max || e.updatedAt > max ? e.updatedAt : max),
    undefined,
  );
  return [
    // The home page lists popular treks, so it changes when they do.
    { url: `${SITE_URL}/`, ...(newest ? { lastModified: newest } : {}) },
    { url: `${SITE_URL}/contact` },
    ...pages.treks.map((t) => ({ url: `${SITE_URL}/treks/${t.slug}`, lastModified: t.updatedAt })),
    ...pages.organizers.map((o) => ({
      url: `${SITE_URL}/organizers/${o.slug}`,
      lastModified: o.updatedAt,
    })),
  ];
}
