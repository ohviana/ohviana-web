'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AdminReview, AdminReviewList } from '@ohviana/contracts';
import { useAction, useLoad } from '@/components/dash/hooks';
import { Loading, Outcome } from '@/components/dash/ui';
import { ReviewCard } from '@/components/Stars';
import { qs } from '@/lib/api';
import { authedFetch } from '@/lib/authed';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'false', label: 'Shown' },
  { value: 'true', label: 'Hidden' },
] as const;

/** Every review; hide abusive or fake ones (hidden reviews don't count in the score). */
export default function AdminReviewsPage() {
  const [hidden, setHidden] = useState<string>('');
  const [extra, setExtra] = useState<AdminReview[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const action = useAction();
  const list = useLoad(async () => {
    const page = await authedFetch(
      `/v1/admin/reviews${qs({ hidden: hidden || undefined, limit: 30 })}`,
      AdminReviewList,
    );
    setExtra([]);
    setCursor(page.nextCursor);
    return page.items;
  }, [hidden]);

  async function more() {
    if (!cursor) return;
    const page = await authedFetch(
      `/v1/admin/reviews${qs({ hidden: hidden || undefined, limit: 30, cursor })}`,
      AdminReviewList,
    );
    setExtra((prev) => [...prev, ...page.items]);
    setCursor(page.nextCursor);
  }

  async function toggle(r: AdminReview) {
    const updated = await action.run(() =>
      authedFetch(`/v1/admin/reviews/${r.id}/${r.hidden ? 'unhide' : 'hide'}`, AdminReview, {
        method: 'POST',
      }),
    );
    if (!updated) return;
    const swap = (rows: AdminReview[]) => rows.map((x) => (x.id === r.id ? updated : x));
    list.setData((rows) => (rows ? swap(rows) : rows));
    setExtra(swap);
  }

  const rows = [...(list.data ?? []), ...extra];
  return (
    <>
      <h1 style={{ margin: 0 }}>Reviews</h1>
      <div className="field" style={{ maxWidth: 220 }}>
        <label htmlFor="r-filter">Show</label>
        <select id="r-filter" value={hidden} onChange={(e) => setHidden(e.target.value)}>
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <Outcome error={list.error ?? action.error} />
      {list.loading && !list.data && <Loading />}
      {list.data && rows.length === 0 && <p className="muted">No reviews.</p>}
      {rows.map((r) => (
        <div key={r.id} className={`stack${r.hidden ? ' review-hidden' : ''}`} style={{ gap: 6 }}>
          <span className="cluster small" style={{ justifyContent: 'space-between' }}>
            <span>
              For <Link href={`/organizers/${r.organizer.slug}`}>{r.organizer.name}</Link> · booking{' '}
              {r.bookingReference}
              {r.hidden && <span className="badge danger"> Hidden</span>}
            </span>
            <button
              type="button"
              className="secondary small"
              disabled={action.pending}
              onClick={() => void toggle(r)}
            >
              {r.hidden ? 'Unhide' : 'Hide'}
            </button>
          </span>
          <ReviewCard review={r} orgName={r.organizer.name} />
        </div>
      ))}
      {cursor && (
        <button
          type="button"
          className="secondary"
          onClick={more}
          style={{ alignSelf: 'flex-start' }}
        >
          Load more
        </button>
      )}
    </>
  );
}
