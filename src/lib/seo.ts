import type { PublicOrganizerDetail, PublicTrekDetail } from '@ohviana/contracts';
import { SITE_URL } from './env';
import { logoSrc, mediaUrl } from './media';
import { CONTACT_EMAIL, SOCIAL_LINKS } from './social';

/**
 * Search-facing helpers: meta descriptions and Schema.org JSON-LD. Pure functions of API data,
 * so what Google reads always matches what the page shows.
 */

type JsonLd = Record<string, unknown>;

const CONTEXT = 'https://schema.org';
const abs = (path: string) => `${SITE_URL}${path}`;
const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/** The site-wide share image (app/opengraph-image.jpg), for pages without a photo of their own. */
export const DEFAULT_SHARE_IMAGE = '/opengraph-image.jpg';

/** Joins sentences into a snippet-sized description, cut at a word boundary (~155 characters). */
export function metaDescription(parts: (string | null | undefined)[], max = 155): string {
  const text = parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ');
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,.;:—-]+$/, '')}…`;
}

/** Ohviana itself (home page): the entity behind the site, its logo and profiles. */
export function siteJsonLd(): JsonLd {
  return {
    '@context': CONTEXT,
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: 'Ohviana',
        url: abs('/'),
        logo: abs('/brand/icon-512.png'),
        email: CONTACT_EMAIL,
        sameAs: SOCIAL_LINKS.map((s) => s.href),
        description:
          'Marketplace for booking treks and weekend trips in India with verified organizers.',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'Ohviana',
        url: abs('/'),
        inLanguage: 'en-IN',
        publisher: { '@id': ORGANIZATION_ID },
      },
    ],
  };
}

/** Breadcrumb trail from the home page; Google shows it in place of the raw URL. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...trail].map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: abs(step.path),
    })),
  };
}

/** The trek's best photo as an absolute URL, if it has one. */
export function trekImage(trek: PublicTrekDetail): string | undefined {
  if (trek.coverPhoto) return mediaUrl(trek.coverPhoto.url);
  return trek.heroImageUrl ?? undefined;
}

/**
 * A trek page as a TouristTrip: the destination as a TouristAttraction, and its upcoming
 * departures as one AggregateOffer ("from ₹2,499, 5 departures").
 */
export function trekJsonLd(trek: PublicTrekDetail): JsonLd {
  const a = trek.availability;
  const url = abs(`/treks/${trek.slug}`);
  return {
    '@context': CONTEXT,
    '@type': 'TouristTrip',
    name: `${trek.name} trek`,
    url,
    description: trek.description ?? trek.summary ?? undefined,
    image: trekImage(trek),
    itinerary: {
      '@type': 'TouristAttraction',
      name: trek.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: trek.district ?? undefined,
        addressRegion: trek.state ?? undefined,
        addressCountry: 'IN',
      },
    },
    offers:
      a.batchCount > 0 && a.minPricePaise !== null
        ? {
            '@type': 'AggregateOffer',
            priceCurrency: 'INR',
            lowPrice: a.minPricePaise / 100,
            offerCount: a.batchCount,
            availability: 'https://schema.org/InStock',
            url,
          }
        : undefined,
  };
}

/**
 * An organizer page as an Organization. The rating is travellers' reviews collected by Ohviana
 * (a third party, so eligible for review stars) and is only included once there is one, as
 * shown on the page.
 */
export function organizerJsonLd(o: PublicOrganizerDetail): JsonLd {
  const url = abs(`/organizers/${o.slug}`);
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': `${url}#organization`,
    name: o.name,
    url,
    logo: o.logoUrl ? logoSrc(o.logoUrl) : undefined,
    description: o.description ?? o.tagline ?? undefined,
    address: o.city
      ? { '@type': 'PostalAddress', addressLocality: o.city, addressCountry: 'IN' }
      : undefined,
    aggregateRating:
      o.rating && o.rating.count > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: Math.round(o.rating.average * 10) / 10,
            reviewCount: o.rating.count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };
}
