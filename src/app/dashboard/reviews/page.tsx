'use client';

import { useState, type FormEvent } from 'react';
import { OrganizerReview, OrganizerReviewList } from '@ohviana/contracts';
import { useAction, useLoad } from '@/components/dash/hooks';
import { useOrg } from '@/components/dash/org-context';
import { EmptyState, Loading, Outcome } from '@/components/dash/ui';
import { ReviewCard } from '@/components/Stars';
import { qs } from '@/lib/api';

/** One public reply per review; it can't be changed after posting. */
function ReplyForm({ review, onReplied }: { review: OrganizerReview; onReplied: () => void }) {
  const { call } = useOrg();
  const action = useAction();
  const [text, setText] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await action.run(() =>
      call(`/reviews/${review.id}/reply`, OrganizerReview, {
        method: 'POST',
        body: { reply: text.trim() },
      }),
    );
    if (ok) onReplied();
  }

  return (
    <form className="stack" style={{ gap: 8 }} onSubmit={submit}>
      <label htmlFor={`reply-${review.id}`} className="small muted">
        Reply publicly (once; it can&apos;t be edited later)
      </label>
      <textarea
        id={`reply-${review.id}`}
        rows={2}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Thank ${review.authorName}, or explain what you're changing`}
      />
      <Outcome error={action.error} />
      <button
        type="submit"
        className="small"
        style={{ alignSelf: 'flex-end' }}
        disabled={text.trim().length < 2 || action.pending}
      >
        {action.pending ? 'Posting…' : 'Post reply'}
      </button>
    </form>
  );
}

/** What travellers said about this organizer's trips, newest first. */
export default function ReviewsPage() {
  const { call, can, org } = useOrg();
  const [extra, setExtra] = useState<OrganizerReview[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const list = useLoad(async () => {
    const page = await call(`/reviews${qs({ limit: 20 })}`, OrganizerReviewList);
    setExtra([]);
    setCursor(page.nextCursor);
    return page.items;
  }, [call]);

  async function more() {
    if (!cursor) return;
    const page = await call(`/reviews${qs({ limit: 20, cursor })}`, OrganizerReviewList);
    setExtra((prev) => [...prev, ...page.items]);
    setCursor(page.nextCursor);
  }

  const rows = [...(list.data ?? []), ...extra];
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ margin: 0 }}>Reviews</h1>
        <p className="muted" style={{ margin: 0 }}>
          Travellers rate a trip after it returns. Reviews show on your public page straight away;
          you can reply once to each.
        </p>
      </div>
      <Outcome error={list.error} />
      {list.loading && !list.data && <Loading />}
      {list.data && rows.length === 0 && (
        <EmptyState icon="star" title="No reviews yet">
          <span className="muted small">Travellers can review a trip once it has returned.</span>
        </EmptyState>
      )}
      {rows.map((r) => (
        <div key={r.id} className="stack" style={{ gap: 8 }}>
          {r.hidden && (
            <p className="notice warn small" style={{ margin: 0 }}>
              Hidden by Ohviana: not shown publicly and not counted in your score.
            </p>
          )}
          <ReviewCard review={r} orgName={org.name} />
          {!r.reply && can('bookings:manage') && (
            <div className="card">
              <ReplyForm review={r} onReplied={() => void list.reload()} />
            </div>
          )}
          <span className="small muted">Booking {r.bookingReference}</span>
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
