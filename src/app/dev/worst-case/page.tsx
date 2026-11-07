import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DepartureGroups } from '@/components/DepartureGroups';
import { TrekCard } from '@/components/TrekCard';
import { one as first, type SearchParams } from '@/lib/params';
import { demo, many, one, worst } from './fixtures';

export const metadata: Metadata = { title: 'Worst-case data', robots: { index: false } };

const SETS = { demo, worst, one, empty: { treks: [], batches: [] }, many };
const LABELS: Record<keyof typeof SETS, string> = {
  demo: 'Demo data',
  worst: 'Worst case',
  one: 'One',
  empty: 'Empty',
  many: '300 rows',
};

/** Dev-only: the listing components fed demo vs worst-case data (?data=worst). Never in production. */
export default async function WorstCasePage({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const key = (first((await searchParams).data) ?? 'demo') as keyof typeof SETS;
  const data = SETS[key] ?? demo;

  return (
    <div className="container stack-lg">
      <h1>Trek cards</h1>
      <div className="grid-cards">
        {data.treks.map((t) => (
          <TrekCard key={t.id} trek={t} />
        ))}
      </div>
      <h1>Departures (Explore)</h1>
      <DepartureGroups batches={data.batches} />
      <h1>Departures (trek page)</h1>
      <DepartureGroups batches={data.batches} showTrek={false} />

      {/* Plain chrome, deliberately outside the design system under test. */}
      <style>{`
        .worst-case-toggle { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
          z-index: 200; display: flex; gap: 2px; padding: 3px; border-radius: 999px;
          background: #e5e5e5; font: 13px system-ui; box-shadow: 0 4px 16px rgb(0 0 0 / 0.15); }
        .worst-case-toggle a { padding: 6px 12px; border-radius: 999px; color: #333;
          text-decoration: none; white-space: nowrap; }
        .worst-case-toggle a[aria-current] { background: #fff; color: #000; }
      `}</style>
      <nav className="worst-case-toggle" aria-label="Fixture">
        {(Object.keys(SETS) as (keyof typeof SETS)[]).map((k) => (
          <Link key={k} href={`?data=${k}`} aria-current={k === key ? 'true' : undefined}>
            {LABELS[k]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
