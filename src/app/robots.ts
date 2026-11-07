import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/env';

/**
 * Index canonical trek and organizer pages; keep checkout, personal pages and the consoles out
 * (PRD: SEO). `/dashboard` itself stays crawlable: signed out, it is the organizer pitch page.
 */
export default function robots(): MetadataRoute.Robots {
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
        '/search',
        '/admin',
        '/dashboard/',
        '/dev/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
