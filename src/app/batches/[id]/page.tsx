import type { Metadata } from 'next';
import { PublicBatch } from '@ohviana/contracts';
import { BatchDetails } from '@/components/BatchDetails';
import { apiFetchOrNotFound } from '@/lib/api';
import { dateRange, durationLabel, longDate, price, seatsLabel } from '@/lib/format';
import { mediaUrl } from '@/lib/media';
import { one, type SearchParams } from '@/lib/params';
import { DEFAULT_SHARE_IMAGE, metaDescription } from '@/lib/seo';

type Params = Promise<{ id: string }>;

const getBatch = (id: string) =>
  apiFetchOrNotFound(`/v1/batches/${encodeURIComponent(id)}`, PublicBatch, {
    next: { revalidate: 30 },
  });

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const b = await getBatch((await params).id);
  // Not indexed, but this is the link organizers share on WhatsApp and Instagram: the preview
  // should answer "when, how long, how much, with whom" before anyone taps it.
  const description = metaDescription([
    `${dateRange(b.departureAt, b.returnAt)} · ${durationLabel(b.departureAt, b.returnAt)} · ${price(b.pricePaise)}/person with ${b.organizer.name}.`,
    b.availability === 'available' ? `${seatsLabel(b.seatsLeft)}.` : null,
    b.trek.summary,
  ]);
  const photo = b.trek.photos.find((p) => p.category === 'destination') ?? b.trek.photos[0];
  const image = photo ? mediaUrl(photo.url) : DEFAULT_SHARE_IMAGE;
  return {
    title: `${b.trek.title} — ${longDate(b.departureAt)}`,
    description,
    // Departures come and go; the trek page is the canonical, indexable page.
    robots: { index: false, follow: true },
    alternates: { canonical: `/treks/${b.catalogTrek.slug}` },
    openGraph: { title: b.trek.title, description, images: [image] },
    twitter: { card: 'summary_large_image', images: [image] },
  };
}

export default async function BatchPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const batch = await getBatch((await params).id);
  const via = one((await searchParams).via);
  return (
    <div className="container">
      <BatchDetails batch={batch} via={via} />
    </div>
  );
}
