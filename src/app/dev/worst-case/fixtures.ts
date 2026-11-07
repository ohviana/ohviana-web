import type { PublicBatch, PublicTrekSummary } from '@ohviana/contracts';

/**
 * Dev-only data for /dev/worst-case: the same shapes the API returns, once as typical data and
 * once as the realistic worst case (schema limits, missing optionals, counts of 1, broken media).
 */

let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const at = (day: number, hour = 21) =>
  new Date(Date.UTC(2026, 10, day, hour - 5, 30)).toISOString(); // IST → UTC

function trek(t: Partial<PublicTrekSummary> & Pick<PublicTrekSummary, 'name'>): PublicTrekSummary {
  return {
    id: id(),
    slug: t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    state: 'Karnataka',
    region: null,
    district: 'Chikkamagaluru',
    difficulty: 'moderate',
    summary: 'Grassland ridges and a sunrise summit above the clouds.',
    maxAltitudeM: 1894,
    heroImageUrl: null,
    coverPhoto: null,
    availability: {
      batchCount: 6,
      organizerCount: 3,
      minPricePaise: 249900,
      nextDepartureAt: at(14),
    },
    ...t,
  };
}

interface BatchOpts {
  day: number;
  trekName?: string;
  org?: string;
  logoUrl?: string | null;
  rating?: PublicBatch['organizer']['rating'];
  price?: number;
  seatsLeft?: number;
  availability?: PublicBatch['availability'];
  days?: number;
  startPoint?: string | null;
  difficulty?: PublicBatch['trek']['difficulty'];
  photo?: string;
}

function batch(o: BatchOpts): PublicBatch {
  const trekName = o.trekName ?? 'Kudremukh Peak';
  const org = o.org ?? 'Bangalore Trekking Club';
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    id: id(),
    departureAt: at(o.day),
    returnAt: at(o.day + (o.days ?? 2), 6),
    bookingCutoffAt: at(o.day, 12),
    pricePaise: o.price ?? 349900,
    capacity: 30,
    seatsLeft: o.seatsLeft ?? 18,
    maxSeatsPerBooking: 6,
    availability: o.availability ?? 'available',
    organizer: {
      id: id(),
      name: org,
      slug: slug(org),
      city: 'Bengaluru',
      logoUrl: o.logoUrl ?? null,
      rating: o.rating === undefined ? { average: 4.6, count: 38 } : o.rating,
    },
    trek: {
      id: id(),
      title: trekName,
      slug: slug(trekName),
      summary: null,
      durationDays: o.days ?? 2,
      startPoint: o.startPoint === undefined ? 'Bengaluru' : o.startPoint,
      difficulty: o.difficulty === undefined ? 'moderate' : o.difficulty,
      itinerary: [],
      inclusions: [],
      exclusions: [],
      thingsToCarry: [],
      cancellationPolicy: null,
      photos: o.photo
        ? [
            {
              id: id(),
              url: o.photo,
              thumbUrl: o.photo,
              category: 'destination',
              caption: null,
              width: 1600,
              height: 1067,
              sortOrder: 0,
            },
          ]
        : [],
    },
    catalogTrek: { id: id(), name: trekName, slug: slug(trekName) },
    pickups: [],
  };
}

export const demo = {
  treks: [
    trek({ name: 'Kudremukh Peak' }),
    trek({ name: 'Kumara Parvatha', district: 'Kodagu', difficulty: 'difficult' }),
    trek({ name: 'Netravati Peak', district: 'Dakshina Kannada' }),
  ],
  batches: [
    batch({ day: 14 }),
    batch({
      day: 14,
      trekName: 'Kumara Parvatha',
      org: 'Trek Mates India',
      difficulty: 'difficult',
    }),
    batch({ day: 14, trekName: 'Netravati Peak', org: 'Western Ghats Explorers' }),
    batch({ day: 15, trekName: 'Kumara Parvatha', org: 'Bangalore Trekking Club' }),
    batch({ day: 15, trekName: 'Netravati Peak', org: 'Trek Mates India', seatsLeft: 4 }),
  ],
};

const LONG_TREK =
  'Kumara Parvatha (Pushpagiri) via Bisle Ghat & Mallalli Falls — Full Traverse with Summit Night';
const LONG_ORG = 'Sahyadri Mountaineers & Adventure Sports Foundation (Regd.), Bengaluru Chapter';

export const worst = {
  treks: [
    trek({
      name: LONG_TREK,
      district: 'Dakshina Kannada',
      difficulty: 'challenging',
      // catalog summary limit is 300 (contracts catalog.ts:33)
      summary:
        'A demanding two-day traverse through shola forest and open grassland, crossing the Pushpagiri Wildlife Sanctuary with a night camp below the summit. Expect steep ascents of 1,400 m, leeches in the monsoon, river crossings after heavy rain, and a long descent on loose scree that is hard on knees and ankles.',
      maxAltitudeM: 1712,
      availability: {
        batchCount: 1,
        organizerCount: 1,
        minPricePaise: 1249950,
        nextDepartureAt: at(14),
      },
    }),
    trek({
      name: 'Ooty',
      district: null,
      state: null,
      difficulty: null,
      summary: null,
      maxAltitudeM: 0,
      availability: {
        batchCount: 1,
        organizerCount: 1,
        minPricePaise: 49900,
        nextDepartureAt: null,
      },
    }),
    trek({
      name: 'Sakleshpur Green Route Railway Track Walk — Edakumeri to Donigal (Monsoon Special)',
      availability: {
        batchCount: 0,
        organizerCount: 0,
        minPricePaise: null,
        nextDepartureAt: null,
      },
    }),
  ],
  batches: [
    batch({
      day: 14,
      trekName: LONG_TREK,
      org: LONG_ORG,
      // Many reviews: the count needs a separator and must not widen the organizer line.
      rating: { average: 4.8, count: 1284 },
      logoUrl: 'https://example.com/logos/missing-logo.png',
      price: 1249950,
      seatsLeft: 1,
      days: 12,
      difficulty: 'challenging',
      // startPoint limit is 80 (contracts organizer.ts:177)
      startPoint: 'Majestic KSRTC Bus Stand Platform 17, opp. Sangam Theatre, Gandhinagar, Bengal',
      photo: '/media/does-not-exist.jpg',
    }),
    batch({
      day: 14,
      trekName: 'Ooty',
      org: 'Jo',
      rating: { average: 5, count: 1 },
      startPoint: null,
      difficulty: null,
      days: 1,
    }),
    batch({
      day: 14,
      org: 'WanderLustTrekkersBengaluruOfficial',
      availability: 'sold_out',
      rating: null, // no reviews yet
    }),
    batch({ day: 14, org: '🏔️ Peak Seekers', availability: 'booking_closed' }),
    batch({ day: 14, trekName: 'Kumara Parvatha', org: 'Đặng Thị Ngọc Hân Adventures' }),
    batch({ day: 14, trekName: 'Netravati Peak', org: 'Trek Mates India' }),
    batch({ day: 14, trekName: 'Kumara Parvatha', org: 'Trek Mates India' }),
    batch({ day: 21, trekName: 'Ooty', org: 'Jo', seatsLeft: 120 }),
  ],
};

export const one = {
  treks: [worst.treks[1]!],
  batches: [worst.batches[1]!],
};

export const many = {
  treks: Array.from({ length: 60 }, (_, i) => trek({ name: `Trek ${i + 1}` })),
  batches: Array.from({ length: 300 }, (_, i) =>
    batch({ day: 8 + (i % 20), org: `Organizer ${i % 37}`, trekName: `Trek ${i % 60}` }),
  ),
};
