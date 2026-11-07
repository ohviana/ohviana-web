'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  CreateBookingResponse,
  MeResponse,
  MyBookingList,
  type PublicBatch,
} from '@ohviana/contracts';
import { SignInOptions } from '@/components/SignInOptions';
import { ApiError, apiFetch } from '@/lib/api';
import { authedFetch } from '@/lib/authed';
import { dateRange, dateTime, price } from '@/lib/format';
import { toE164 } from '@/lib/phone';
import { authHeader, isSignedIn, rememberBookingToken } from '@/lib/session';

interface Guest {
  fullName: string;
  age: string;
  phone: string;
  /** '' = same pickup as the booking. */
  pickupPointId: string;
}

const blankGuest = (): Guest => ({ fullName: '', age: '', phone: '', pickupPointId: '' });

interface Props {
  batch: PublicBatch;
  via?: string | undefined;
}

export function CheckoutForm({ batch, via }: Props) {
  const router = useRouter();
  const maxSeats = Math.max(1, Math.min(batch.maxSeatsPerBooking, batch.seatsLeft));

  const [quantity, setQuantity] = useState(1);
  const [pickupPointId, setPickupPointId] = useState(
    batch.pickups.length === 1 ? batch.pickups[0]!.pickupPointId : '',
  );
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [emergency, setEmergency] = useState({ name: '', phone: '' });
  const [guests, setGuests] = useState<Guest[]>([blankGuest()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Bookings belong to an account: people sign in (Google or an email code) before the form, so
   * a Google round trip never loses what they typed. null while checking.
   */
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  /** Prefill from the profile and last booking (blank fields only). */
  async function prefill() {
    const [me, last] = await Promise.all([
      authedFetch('/v1/me', MeResponse).catch(() => null),
      authedFetch('/v1/me/bookings?limit=1', MyBookingList).catch(() => null),
    ]);
    const previous = last?.items[0]?.contact;
    const phone = me?.user.phone ?? previous?.phone ?? '';
    setContact((c) => ({
      name: c.name || me?.user.fullName || previous?.name || '',
      phone: c.phone || phone.replace(/^\+91(?=\d{10}$)/, ''),
      email: c.email || me?.user.email || previous?.email || '',
    }));
  }

  useEffect(() => {
    void (async () => {
      const yes = await isSignedIn();
      setSignedIn(yes);
      if (yes) await prefill();
    })();
  }, []);

  async function onSignedIn() {
    setSignedIn(true);
    await prefill();
  }

  /**
   * One Idempotency-Key per distinct request body: retrying the same submission (double tap,
   * flaky network) can never create a second booking, while editing the form starts afresh.
   */
  const attempt = useRef<{ body: string; key: string } | null>(null);

  function setSeats(n: number) {
    setQuantity(n);
    setGuests((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? blankGuest()));
  }

  const total = useMemo(() => batch.pricePaise * quantity, [batch.pricePaise, quantity]);

  // Phones: a bottom bar carries the total until the summary (and its button) scrolls into view.
  const summaryRef = useRef<HTMLElement>(null);
  const [summaryVisible, setSummaryVisible] = useState(false);
  useEffect(() => {
    const el = summaryRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSummaryVisible(!!e?.isIntersecting), {
      threshold: 0.2,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** The request body, or null after showing what to fix. */
  function prepare(): { serialized: string } | null {
    const fail = (message: string) => {
      setError(message);
      return null;
    };
    const phone = toE164(contact.phone);
    if (!phone) return fail('Enter a valid mobile number, e.g. 98765 43210.');
    const emergencyPhone = emergency.phone ? toE164(emergency.phone) : null;
    if (emergency.phone && !emergencyPhone) return fail('Enter a valid emergency contact number.');
    if (emergency.phone && !emergency.name.trim()) return fail('Add the emergency contact’s name.');
    if (batch.pickups.length > 0 && !pickupPointId) return fail('Choose a pickup point.');
    const guestPhones = guests.map((g) => (g.phone.trim() ? toE164(g.phone) : null));
    const badPhone = guests.findIndex((g, i) => g.phone.trim() && !guestPhones[i]);
    if (badPhone >= 0) return fail(`Enter a valid mobile number for traveller ${badPhone + 1}.`);

    const body = {
      batchId: batch.id,
      quantity,
      ...(via ? { entryToken: via } : {}),
      ...(pickupPointId ? { pickupPointId } : {}),
      contact: {
        name: contact.name.trim(),
        phone,
        ...(contact.email.trim() ? { email: contact.email.trim() } : {}),
      },
      ...(emergencyPhone
        ? { emergencyContact: { name: emergency.name.trim(), phone: emergencyPhone } }
        : {}),
      guests: guests.map((g, i) => ({
        fullName: g.fullName.trim(),
        ...(g.age ? { age: Number(g.age) } : {}),
        ...(guestPhones[i] ? { phone: guestPhones[i] } : {}),
        ...(g.pickupPointId ? { pickupPointId: g.pickupPointId } : {}),
      })),
    };
    return { serialized: JSON.stringify(body) };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const prepared = prepare();
    if (!prepared) return;
    // Signed out in another tab since: ask again rather than fail the booking.
    if (!(await isSignedIn())) return setSignedIn(false);
    await book(prepared.serialized);
  }

  async function book(serialized: string) {
    if (attempt.current?.body !== serialized) {
      attempt.current = { body: serialized, key: crypto.randomUUID() };
    }

    setSubmitting(true);
    try {
      const booking = await apiFetch('/v1/bookings', CreateBookingResponse, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': attempt.current.key,
          ...(await authHeader()),
        },
        body: serialized,
      });
      rememberBookingToken(booking.bookingReference, booking.accessToken);
      // The token also travels in the URL fragment (never sent to servers or logs) in case
      // this browser can't store it.
      router.push(
        `/bookings/${booking.bookingReference}#t=${encodeURIComponent(booking.accessToken)}`,
      );
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError) {
        if (err.code === 'SOLD_OUT' || err.code === 'BOOKING_CUTOFF') {
          attempt.current = null;
        }
        setError(err.message);
      } else {
        // Network failure: the same key is kept, so pressing again is safe.
        setError(
          'Network problem — your booking may not have gone through. Press “Confirm booking” again — it won’t create a second booking.',
        );
      }
    }
  }

  const backLink = `/batches/${batch.id}${via ? `?via=${encodeURIComponent(via)}` : ''}`;
  const heading = (
    <header className="stack">
      <span className="small muted">
        <Link href={backLink}>← Departure details</Link>
      </span>
      <h1 style={{ margin: 0 }}>Book {batch.trek.title}</h1>
      <span className="muted">
        {dateRange(batch.departureAt, batch.returnAt)} · {batch.organizer.name}
      </span>
    </header>
  );

  if (signedIn === null) return <div className="stack-lg">{heading}</div>;
  if (!signedIn) {
    const here = `/book/${batch.id}${via ? `?via=${encodeURIComponent(via)}` : ''}`;
    return (
      <div className="stack-lg" style={{ maxWidth: 520 }}>
        {heading}
        <section className="card stack" style={{ gap: 16 }}>
          <div>
            <h2 style={{ margin: '0 0 4px' }}>Sign in to book</h2>
            <p className="small muted" style={{ margin: 0 }}>
              Your booking is saved to your account, so you can find it in My bookings. It takes a
              few seconds; no password.
            </p>
          </div>
          <SignInOptions next={here} onSignedIn={onSignedIn} />
        </section>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="two-col" noValidate={false}>
      <div className="stack-lg">
        {heading}

        <fieldset className="stack">
          <legend>
            <span className="step-num">1</span> Seats &amp; pickup
          </legend>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="qty">Number of travellers</label>
              <select id="qty" value={quantity} onChange={(e) => setSeats(Number(e.target.value))}>
                {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            {batch.pickups.length > 0 && (
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label htmlFor="pickup">Pickup point</label>
                <select
                  id="pickup"
                  required
                  value={pickupPointId}
                  onChange={(e) => setPickupPointId(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {batch.pickups.map((p) => (
                    <option key={p.pickupPointId} value={p.pickupPointId}>
                      {p.name} — {dateTime(p.pickupAt)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className="stack">
          <legend>
            <span className="step-num">2</span> Your contact details
          </legend>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="c-name">Full name</label>
              <input
                id="c-name"
                required
                minLength={2}
                autoComplete="name"
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="c-phone">Mobile</label>
              <input
                id="c-phone"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="98765 43210"
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="c-email">
                Email <span className="hint">(for your confirmation)</span>
              </label>
              <input
                id="c-email"
                type="email"
                autoComplete="email"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="stack">
          <legend>
            <span className="step-num">3</span> Travellers
          </legend>
          {guests.map((g, i) => (
            <div key={i} className="form-grid traveller-fields">
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label htmlFor={`g-${i}`}>Traveller {i + 1} name</label>
                <input
                  id={`g-${i}`}
                  required
                  minLength={2}
                  value={g.fullName}
                  placeholder={i === 0 && contact.name ? contact.name : undefined}
                  onChange={(e) =>
                    setGuests(
                      guests.map((x, j) => (j === i ? { ...x, fullName: e.target.value } : x)),
                    )
                  }
                />
              </div>
              <div className="field">
                <label htmlFor={`g-age-${i}`}>
                  Age <span className="hint">(optional)</span>
                </label>
                <input
                  id={`g-age-${i}`}
                  type="number"
                  min={1}
                  max={120}
                  inputMode="numeric"
                  value={g.age}
                  onChange={(e) =>
                    setGuests(guests.map((x, j) => (j === i ? { ...x, age: e.target.value } : x)))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor={`g-phone-${i}`}>
                  Traveller {i + 1} mobile <span className="hint">(optional)</span>
                </label>
                <input
                  id={`g-phone-${i}`}
                  inputMode="tel"
                  placeholder={i === 0 && contact.phone ? contact.phone : '98765 43210'}
                  value={g.phone}
                  onChange={(e) =>
                    setGuests(guests.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))
                  }
                />
              </div>
              {batch.pickups.length > 1 && guests.length > 1 && (
                <div className="field">
                  <label htmlFor={`g-pickup-${i}`}>Traveller {i + 1} pickup</label>
                  <select
                    id={`g-pickup-${i}`}
                    value={g.pickupPointId}
                    onChange={(e) =>
                      setGuests(
                        guests.map((x, j) =>
                          j === i ? { ...x, pickupPointId: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    <option value="">Same as booking</option>
                    {batch.pickups.map((p) => (
                      <option key={p.pickupPointId} value={p.pickupPointId}>
                        {p.name} — {dateTime(p.pickupAt)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
          {guests[0] && !guests[0].fullName && contact.name && (
            <button
              type="button"
              className="secondary"
              style={{ alignSelf: 'flex-start' }}
              onClick={() =>
                setGuests(guests.map((x, j) => (j === 0 ? { ...x, fullName: contact.name } : x)))
              }
            >
              I’m traveller 1
            </button>
          )}
        </fieldset>

        <fieldset className="stack">
          <legend>
            <span className="step-num">4</span> Emergency contact{' '}
            <span className="hint">(recommended)</span>
          </legend>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="e-name">Name</label>
              <input
                id="e-name"
                value={emergency.name}
                onChange={(e) => setEmergency({ ...emergency, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="e-phone">Mobile</label>
              <input
                id="e-phone"
                type="tel"
                inputMode="tel"
                value={emergency.phone}
                onChange={(e) => setEmergency({ ...emergency, phone: e.target.value })}
              />
            </div>
          </div>
        </fieldset>
      </div>

      <aside className="card stack sticky" id="summary" ref={summaryRef}>
        <h2>Summary</h2>
        <dl className="kv small">
          <dt>Departure</dt>
          <dd>{dateTime(batch.departureAt)}</dd>
          <dt>Price</dt>
          <dd>
            {price(batch.pricePaise)} × {quantity}
          </dd>
        </dl>
        <div className="spread">
          <strong>Total</strong>
          <span className="price">{price(total)}</span>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Payment is arranged with the organizer. Your seats are confirmed as soon as you book.
        </p>
        {batch.trek.cancellationPolicy && (
          <details className="small">
            <summary>Cancellation policy</summary>
            <p style={{ whiteSpace: 'pre-line', marginTop: 8 }}>{batch.trek.cancellationPolicy}</p>
          </details>
        )}
        {error && (
          <p className="notice danger small" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Booking…' : 'Confirm booking'}
        </button>
      </aside>

      <div className="book-bar" data-hidden={summaryVisible}>
        <span>
          <span className="price">{price(total)}</span>
          <span className="book-bar-meta">
            {quantity} {quantity === 1 ? 'traveller' : 'travellers'}
          </span>
        </span>
        <button
          type="button"
          onClick={() =>
            summaryRef.current?.scrollIntoView({
              behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
              block: 'start',
            })
          }
        >
          Review &amp; book
        </button>
      </div>
    </form>
  );
}
