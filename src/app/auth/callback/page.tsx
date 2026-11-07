'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

/** Only same-site paths, so the link can't bounce people to another site after sign-in. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/my-bookings';
}

/**
 * Google sends people back here. The Supabase client exchanges the `?code=` for a session on
 * load (PKCE); this page waits for it, then continues to where they were going.
 */
function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const [failed, setFailed] = useState<string | null>(
    params.get('error_description') ?? params.get('error'),
  );

  useEffect(() => {
    if (failed) return;
    const next = safeNext(params.get('next'));
    const supabase = getSupabase();
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      router.replace(next);
    };
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) go();
    });
    void supabase.auth.getSession().then(({ data: s, error }) => {
      if (s.session) go();
      else if (error) setFailed(error.message);
    });
    // The exchange normally takes well under a second.
    const timeout = setTimeout(() => {
      if (!done) setFailed('Sign-in took too long.');
    }, 15_000);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [failed, params, router]);

  if (failed) {
    return (
      <div className="stack">
        <h1 style={{ fontSize: '1.6rem', margin: 0 }}>Couldn&apos;t sign you in</h1>
        <p className="muted" style={{ margin: 0 }}>
          {failed} Please try again.
        </p>
        <Link
          className="btn"
          href={`/login?next=${encodeURIComponent(safeNext(params.get('next')))}`}
        >
          Back to sign in
        </Link>
      </div>
    );
  }
  return <p className="muted">Signing you in…</p>;
}

export default function AuthCallbackPage() {
  return (
    <div className="container narrow">
      <Suspense fallback={<p className="muted">Signing you in…</p>}>
        <Callback />
      </Suspense>
    </div>
  );
}
