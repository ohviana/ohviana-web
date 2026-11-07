import { describe, expect, it } from 'vitest';
import type { PublicOrganizerDetail, PublicTrekDetail } from '@ohviana/contracts';
import { breadcrumbJsonLd, metaDescription, organizerJsonLd, trekJsonLd } from './seo';

const trek: PublicTrekDetail = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Kudremukh',
  slug: 'kudremukh',
  state: 'Karnataka',
  region: null,
  district: 'Chikkamagaluru',
  difficulty: 'moderate',
  summary: 'Rolling grasslands to the horse-face peak.',
  description: null,
  maxAltitudeM: 1894,
  heroImageUrl: null,
  coverPhoto: null,
  availability: {
    batchCount: 5,
    organizerCount: 3,
    minPricePaise: 249900,
    nextDepartureAt: null,
  },
};

const organizer = (rating: PublicOrganizerDetail['rating']): PublicOrganizerDetail => ({
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Ghats Trail Co.',
  slug: 'ghats-trail-co',
  city: 'Bengaluru',
  logoUrl: null,
  rating,
  tagline: 'Small groups.',
  description: null,
  upcomingBatchCount: 4,
  stats: { completedBatches: 3, trekkersHosted: 60, treksOffered: 2, memberSince: 2026 },
});

describe('metaDescription', () => {
  it('joins parts and leaves short text alone', () => {
    expect(metaDescription(['One.', null, ' Two. '])).toBe('One. Two.');
  });

  it('cuts long text at a word boundary, within the limit', () => {
    const out = metaDescription(['word '.repeat(60)], 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out).toMatch(/word…$/);
  });
});

describe('structured data', () => {
  /** What search engines read: undefined fields are dropped by JSON serialization. */
  const read = (ld: Record<string, unknown>): unknown => JSON.parse(JSON.stringify(ld));

  it('describes a trek with its place and its lowest price in rupees', () => {
    expect(read(trekJsonLd(trek))).toMatchObject({
      '@type': 'TouristTrip',
      itinerary: { address: { addressLocality: 'Chikkamagaluru', addressRegion: 'Karnataka' } },
      offers: { priceCurrency: 'INR', lowPrice: 2499, offerCount: 5 },
    });
  });

  it('omits offers for a trek with no departures', () => {
    const ld = trekJsonLd({
      ...trek,
      availability: { ...trek.availability, batchCount: 0, minPricePaise: null },
    });
    expect(read(ld)).not.toHaveProperty('offers');
  });

  it('adds review stars only once an organizer has been rated', () => {
    expect(read(organizerJsonLd(organizer(null)))).not.toHaveProperty('aggregateRating');
    expect(read(organizerJsonLd(organizer({ average: 4.6666, count: 12 })))).toMatchObject({
      aggregateRating: { ratingValue: 4.7, reviewCount: 12, bestRating: 5 },
    });
  });

  it('starts every breadcrumb trail at the home page', () => {
    expect(read(breadcrumbJsonLd([{ name: 'Kudremukh', path: '/treks/kudremukh' }]))).toMatchObject(
      {
        itemListElement: [
          { position: 1, name: 'Home' },
          { position: 2, name: 'Kudremukh', item: expect.stringMatching(/\/treks\/kudremukh$/) },
        ],
      },
    );
  });
});
