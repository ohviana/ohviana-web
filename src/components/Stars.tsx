import type { OrganizerRating, PublicReview, RatingSummary } from '@ohviana/contracts';
import { ASPECTS, ratingValue, tripMonth } from '@/lib/reviews';

/** Read-only stars, e.g. ★★★★☆ for 4 (rounded to the nearest whole star). */
export function Stars({ value, size }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span
      className="stars"
      role="img"
      aria-label={`${ratingValue(value)} out of 5 stars`}
      style={size ? { fontSize: size } : undefined}
    >
      {'★'.repeat(full)}
      <span className="stars-off">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

/** Compact score next to an organizer's name: ★ 4.6 (23). Nothing until they have reviews. */
export function RatingBadge({ rating }: { rating: OrganizerRating | null }) {
  if (!rating) return null;
  return (
    <span
      className="rating-badge"
      title={`${ratingValue(rating.average)} out of 5 from ${rating.count} review${rating.count === 1 ? '' : 's'}`}
    >
      <span aria-hidden="true">★</span> {ratingValue(rating.average)}
      <span className="muted"> ({rating.count})</span>
    </span>
  );
}

/** The organizer's score and a bar per side rating. */
export function RatingSummaryCard({ summary, name }: { summary: RatingSummary; name: string }) {
  return (
    <div className="card rating-summary">
      <div className="rating-score">
        <strong>{ratingValue(summary.average)}</strong>
        <Stars value={summary.average} size={20} />
        <span className="small muted">
          {summary.count} review{summary.count === 1 ? '' : 's'} of {name}
        </span>
      </div>
      <ul className="rating-bars">
        {ASPECTS.map((a) => {
          const value = summary.aspects[a.key];
          return (
            <li key={a.key}>
              <span>{a.label}</span>
              <span className="rating-track" aria-hidden="true">
                <span style={{ width: `${((value ?? 0) / 5) * 100}%` }} />
              </span>
              <strong>{value === null ? '–' : ratingValue(value)}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One review as the public sees it, with the organizer's reply under it. */
export function ReviewCard({ review, orgName }: { review: PublicReview; orgName: string }) {
  const rated = ASPECTS.filter((a) => review.aspects[a.key] !== null);
  return (
    <article className="card review-card">
      <header className="review-head">
        <span>
          <strong>{review.authorName}</strong>
          <span className="small muted">
            {' '}
            · Trekked with them · {review.trekName} · {tripMonth(review.tripDate)}
          </span>
        </span>
        <Stars value={review.overall} />
      </header>
      {rated.length > 0 && (
        <ul className="review-tags" aria-label="Side ratings">
          {rated.map((a) => (
            <li key={a.key}>
              {a.label} <strong>{review.aspects[a.key]}</strong>
            </li>
          ))}
        </ul>
      )}
      {review.comment && <p className="review-text">{review.comment}</p>}
      {review.reply && (
        <div className="review-reply">
          <strong className="small">Reply from {orgName}</strong>
          <p>{review.reply.text}</p>
        </div>
      )}
    </article>
  );
}
