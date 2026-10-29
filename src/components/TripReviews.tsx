'use client';

import Link from 'next/link';
import { ReviewTripList, type ReviewTrip } from '@ohviana/contracts';
import { useLoad } from '@/components/dash/hooks';
import { PhoneSignIn } from '@/components/PhoneSignIn';
import { Stars } from '@/components/Stars';
import { authedFetch } from '@/lib/authed';
import { dateRange, dateTime } from '@/lib/format';

/** Finished trips waiting for a review first, then upcoming ones, then reviewed ones. */
const rank = (t: ReviewTrip) => (t.canReview ? 0 : t.review ? 2 : 1);

/**
 * "Rate your trips" on My bookings: every trip the signed-in traveller was on (found by their
 * mobile, so friends booked by someone else see theirs too). A review opens after the return.
 */
export function TripReviews() {
  const trips = useLoad(() => authedFetch('/v1/me/review-trips', ReviewTripList), []);
  if (!trips.data) return null;

  if (!trips.data.phoneVerified) {
    return (
      <section className="card stack" style={{ maxWidth: 460 }}>
        <h2 style={{ margin: 0 }}>Rate your trips</h2>
        <p className="muted" style={{ margin: 0 }}>
          Sign in with your mobile number to review trips you&apos;ve been on.
        </p>
        <PhoneSignIn onSignedIn={() => void trips.reload()} />
      </section>
    );
  }
  if (trips.data.items.length === 0) return null;

  const items = [...trips.data.items].sort((a, b) => rank(a) - rank(b));
  return (
    <section className="stack">
      <h2 style={{ margin: 0 }}>Rate your trips</h2>
      {items.map((t) => (
        <div key={t.bookingGuestId} className="card trip-review-row">
          <div className="stack" style={{ gap: 2, minWidth: 0 }}>
            <strong>
              {t.trekName} · {t.organizer.name}
            </strong>
            <span className="small muted">
              {dateRange(t.departureAt, t.returnAt)} · as {t.travellerName}
            </span>
          </div>
          {t.review ? (
            <span className="small muted trip-review-state">
              You rated this <Stars value={t.review.overall} />
            </span>
          ) : t.canReview ? (
            <Link className="btn" href={`/review/${t.bookingGuestId}`}>
              ★ Rate your trip
            </Link>
          ) : (
            <span className="small muted trip-review-state">
              You can rate this after {dateTime(t.returnAt)}
            </span>
          )}
        </div>
      ))}
    </section>
  );
}
