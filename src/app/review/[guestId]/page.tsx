'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { OwnReview, ReviewTripList, type CreateReviewRequest } from '@ohviana/contracts';
import type { ReviewAspect } from '@ohviana/shared';
import { useAction, useLoad } from '@/components/dash/hooks';
import { Loading, Outcome } from '@/components/dash/ui';
import { PhoneSignIn } from '@/components/PhoneSignIn';
import { authedFetch } from '@/lib/authed';
import { dateRange, dateTime } from '@/lib/format';
import { ASPECTS, STAR_WORDS } from '@/lib/reviews';

/** Five tappable stars; `label` names the group for screen readers. */
function StarInput({
  value,
  onChange,
  label,
  big,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  big?: boolean;
  disabled?: boolean;
}) {
  return (
    <span
      className={`star-input${big ? ' big' : ''}`}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={n <= value ? 'on' : ''}
          disabled={disabled}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </span>
  );
}

/** A traveller reviews a finished trip: overall stars, five optional side ratings, a comment. */
export default function ReviewPage() {
  const { guestId } = useParams<{ guestId: string }>();
  const trips = useLoad(() => authedFetch('/v1/me/review-trips', ReviewTripList), []);
  const [overall, setOverall] = useState(0);
  const [aspects, setAspects] = useState<Partial<Record<ReviewAspect, number>>>({});
  const [skipped, setSkipped] = useState<Partial<Record<ReviewAspect, boolean>>>({});
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const action = useAction();

  const trip = trips.data?.items.find((t) => t.bookingGuestId === guestId);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!trip || overall === 0) return;
    const body: CreateReviewRequest = {
      bookingGuestId: trip.bookingGuestId,
      overall,
      aspects: Object.fromEntries(
        ASPECTS.filter((a) => !skipped[a.key] && aspects[a.key]).map((a) => [
          a.key,
          aspects[a.key],
        ]),
      ),
      comment: comment.trim() || undefined,
    };
    const saved = await action.run(() =>
      authedFetch('/v1/me/reviews', OwnReview, { method: 'POST', body }),
    );
    if (saved) setDone(true);
  }

  let content;
  if (trips.loading && !trips.data) content = <Loading />;
  else if (trips.error) content = <Outcome error={trips.error} />;
  else if (trips.data && !trips.data.phoneVerified) {
    content = (
      <div className="card stack" style={{ maxWidth: 420 }}>
        <p style={{ margin: 0 }}>Sign in with your mobile number to review your trip.</p>
        <PhoneSignIn onSignedIn={() => void trips.reload()} />
      </div>
    );
  } else if (!trip) {
    content = (
      <p className="muted">
        We couldn&apos;t find this trip on your mobile number.{' '}
        <Link href="/my-bookings">Back to my bookings</Link>
      </p>
    );
  } else if (done || trip.review) {
    content = (
      <div className="card stack review-thanks">
        <span className="review-thanks-icon" aria-hidden="true">
          🙏
        </span>
        <strong>
          {done
            ? `Thanks, ${trip.travellerName.split(' ')[0]}! Your review is live.`
            : 'You have already reviewed this trip.'}
        </strong>
        <p className="muted small" style={{ margin: 0 }}>
          It helps other trekkers choose. Reviews can&apos;t be changed later, so everyone can trust
          them.
        </p>
        <span className="cluster" style={{ justifyContent: 'center' }}>
          <Link className="btn secondary" href={`/organizers/${trip.organizer.slug}`}>
            See {trip.organizer.name}&apos;s reviews
          </Link>
          <Link className="btn secondary" href="/my-bookings">
            My bookings
          </Link>
        </span>
      </div>
    );
  } else if (!trip.canReview) {
    content = <p className="muted">You can rate this trip after {dateTime(trip.returnAt)}.</p>;
  } else {
    content = (
      <form className="card stack" onSubmit={submit}>
        <div className="stack" style={{ gap: 2 }}>
          <strong>
            {trip.trekName} · {trip.organizer.name}
          </strong>
          <span className="small muted">
            {dateRange(trip.departureAt, trip.returnAt)} · reviewing as {trip.travellerName}
          </span>
        </div>

        <div className="review-overall">
          <strong>How was the trip overall?</strong>
          <StarInput value={overall} onChange={setOverall} label="Overall rating" big />
          <span className="small muted">{overall ? STAR_WORDS[overall] : 'Tap to rate'}</span>
        </div>

        <ul className="review-aspects">
          {ASPECTS.map((a) => (
            <li key={a.key} className={skipped[a.key] ? 'skipped' : ''}>
              <span className="stack" style={{ gap: 0 }}>
                <strong>{a.label}</strong>
                <span className="small muted">{a.hint}</span>
              </span>
              <StarInput
                value={aspects[a.key] ?? 0}
                onChange={(n) => setAspects((s) => ({ ...s, [a.key]: n }))}
                label={a.label}
                disabled={skipped[a.key]}
              />
              <label className="small muted review-skip">
                <input
                  type="checkbox"
                  checked={!!skipped[a.key]}
                  onChange={(e) => setSkipped((s) => ({ ...s, [a.key]: e.target.checked }))}
                />
                Not part of this trip
              </label>
            </li>
          ))}
        </ul>

        <div className="field">
          <label htmlFor="r-comment">
            Tell other trekkers about it <span className="muted small">(optional)</span>
          </label>
          <textarea
            id="r-comment"
            rows={4}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you love? Anything to improve?"
          />
        </div>

        <Outcome error={action.error} />
        <span className="cluster" style={{ justifyContent: 'flex-end' }}>
          {overall === 0 && <span className="small muted">Give an overall rating to submit</span>}
          <button type="submit" disabled={overall === 0 || action.pending}>
            {action.pending ? 'Submitting…' : 'Submit review'}
          </button>
        </span>
      </form>
    );
  }

  return (
    <div className="container narrow stack-lg">
      <header className="stack" style={{ gap: 4 }}>
        <Link href="/my-bookings" className="small">
          ← My bookings
        </Link>
        <h1 style={{ margin: 0 }}>Rate your trip</h1>
      </header>
      {content}
    </div>
  );
}
