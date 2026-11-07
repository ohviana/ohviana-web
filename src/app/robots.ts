import type { MetadataRoute } from 'next';
import { IS_TEST_ENV, SITE_URL } from '@/lib/env';

/**
 * Index canonical trek and organizer pages; keep checkout, personal pages and the consoles out
 * (PRD: SEO). `/dashboard` itself stays crawlable: signed out, it is the organizer pitch page.
 */
export default function robots(): MetadataRoute.Robots {
  // The test site must never compete with ohviana.com in search results.
  if (IS_TEST_ENV) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/book/',
        '/bookings/',
        '/b/',
        '/my-bookings',
        '/account',
        '/login',
        '/auth/',
        '/search',
        '/admin',
        '/dashboard/',
        '/dev/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
