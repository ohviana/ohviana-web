'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { Icon } from '@/components/Icon';
import { SignInOptions } from '@/components/SignInOptions';

export default function LoginPage() {
  return (
    <div className="container">
      <div className="auth-wrap">
        <AuthSide />
        <div className="card stack" style={{ padding: 28, justifyContent: 'center', gap: 20 }}>
          <Suspense fallback={null}>
            <SignIn />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function AuthSide() {
  return (
    <aside className="auth-side">
      <span className="brand">
        <BrandMark label="Ohviana" />
      </span>
      <h2 style={{ color: '#fff', fontSize: '1.7rem', margin: 0 }}>
        Your trips, departures and bookings — in one place.
      </h2>
      <ul className="check-list">
        <li>
          <Icon name="check" size={16} /> Organizers: list trips, publish departures, share booking
          links
        </li>
        <li>
          <Icon name="check" size={16} /> See attendees and download lists for trip leaders
        </li>
        <li>
          <Icon name="check" size={16} /> Travellers: keep all your bookings in one account
        </li>
      </ul>
    </aside>
  );
}

/** Where to go after signing in: `?next=` (same-site paths only), else the dashboard. */
function useNext(): string {
  const next = useSearchParams().get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

/** One flow for new and returning people: Google, or a code emailed to them. */
function SignIn() {
  const router = useRouter();
  const next = useNext();
  return (
    <>
      <div>
        <h1 style={{ fontSize: '1.7rem', marginBottom: 4 }}>Sign in to Ohviana</h1>
        <p className="muted" style={{ margin: 0 }}>
          New here? The same step creates your account. No password needed.
        </p>
      </div>
      <SignInOptions next={next} onSignedIn={() => router.push(next)} />
      <p className="small muted" style={{ margin: 0 }}>
        Already have an account? Use the email it was made with and you&apos;ll land in it,
        organizer dashboard included.
      </p>
    </>
  );
}
