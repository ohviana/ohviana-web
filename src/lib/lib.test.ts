import { describe, expect, it } from 'vitest';
import {
  dateRange,
  dateTime,
  dateTimeIst,
  price,
  seatsLabel,
  thisAndNextWeekIst,
  todayIst,
} from './format';
import { toE164 } from './phone';

describe('thisAndNextWeekIst', () => {
  it('runs from today to Sunday of next week, in IST', () => {
    // Thursday 29 Oct → Sunday 8 Nov.
    expect(thisAndNextWeekIst(new Date('2026-10-29T04:30:00Z'))).toEqual({
      from: '2026-10-29',
      to: '2026-11-08',
    });
    // On a Sunday, "this week" ends today: through the following Sunday.
    expect(thisAndNextWeekIst(new Date('2026-11-01T06:00:00Z')).to).toBe('2026-11-08');
    // 1:30 am Monday IST is still Sunday in UTC: the IST day counts.
    expect(thisAndNextWeekIst(new Date('2026-11-01T20:00:00Z'))).toEqual({
      from: '2026-11-02',
      to: '2026-11-15',
    });
  });
});

describe('toE164', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['098765-43210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['+1 415 555 0100', '+14155550100'],
  ])('%s -> %s', (input, expected) => {
    expect(toE164(input)).toBe(expected);
  });

  it.each(['12345', '5876543210', '+0123', 'call me'])('rejects %s', (input) => {
    expect(toE164(input)).toBeNull();
  });
});

describe('formatting (always IST)', () => {
  it('shows whole rupees without paise', () => {
    expect(price(249_900)).toBe('₹2,499');
    expect(price(249_950)).toBe('₹2,499.50');
  });

  it('formats an evening UTC instant on the next IST day', () => {
    // 2026-10-23 19:00 UTC = 24 Oct 00:30 IST
    expect(dateTime('2026-10-23T19:00:00.000Z')).toMatch(/24 Oct/);
    expect(todayIst(new Date('2026-10-23T19:00:00.000Z'))).toBe('2026-10-24');
  });

  it('labels trek-pass times with the zone they are shown in', () => {
    // 2026-10-23 16:00 UTC = 9:30 pm IST
    expect(dateTimeIst('2026-10-23T16:00:00.000Z')).toMatch(/23 Oct, 9:30 pm IST$/);
  });

  it('formats ranges across months', () => {
    expect(dateRange('2026-10-23T16:00:00Z', '2026-10-25T16:00:00Z')).toBe('23–25 Oct');
    expect(dateRange('2026-10-30T16:00:00Z', '2026-11-01T16:00:00Z')).toBe('30 Oct – 1 Nov');
  });

  it('labels scarcity', () => {
    expect(seatsLabel(0)).toBe('Sold out');
    expect(seatsLabel(3)).toBe('Only 3 left');
    expect(seatsLabel(12)).toBe('12 seats left');
  });
});
