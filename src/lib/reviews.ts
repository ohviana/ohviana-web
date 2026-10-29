import type { ReviewAspect } from '@ohviana/shared';

/** The five side ratings of a trip review, in the order they are asked. */
export const ASPECTS: { key: ReviewAspect; label: string; hint: string }[] = [
  { key: 'stay', label: 'Stay', hint: 'Homestay, tent or camp' },
  { key: 'bus', label: 'Bus / travel', hint: 'Comfort and on-time pickup' },
  { key: 'food', label: 'Food', hint: 'Taste and quantity' },
  { key: 'leader', label: 'Trek leader', hint: 'Guidance and support' },
  { key: 'safety', label: 'Safety & organisation', hint: 'Planning, first aid, group care' },
];

export const STAR_WORDS = ['', 'Poor', 'Below average', 'Okay', 'Good', 'Excellent'] as const;

/** "4.6" — one decimal, always. */
export const ratingValue = (average: number) => average.toFixed(1);

/** "Sep 2026" — when the reviewed trip happened (IST). */
export function tripMonth(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}
