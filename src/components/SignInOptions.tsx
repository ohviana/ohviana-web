'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  AUTH_MODE,
  sendEmailCode,
  setDevUser,
  signInWithGoogle,
  verifyEmailCode,
} from '@/lib/session';

interface Props {
  /** Where Google sign-in returns to (a same-site path), e.g. the page showing this. */
  next: string;
  /** Called after an email-code (or dev) sign-in; Google leaves the page and comes back. */
  onSignedIn: () => void | Promise<void>;
}

/** Supabase asks for a minute between codes to the same address. */
const RESEND_WAIT_MS = 60_000;
/** Supabase's "Email OTP Length" can be 6–10 digits (newer projects default to 8). */
const CODE_RE = /^\d{6,10}$/;
const CODE_MAX = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Plain words for the errors people actually hit; anything else keeps Supabase's message. */
function friendly(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  const message = err instanceof Error ? err.message : '';
  if (code === 'otp_expired' || /expired or is invalid/i.test(message)) {
    return 'That code is wrong or has expired. Check the latest email, or send a new code.';
  }
  if (code === 'over_email_send_rate_limit' || /security purposes|rate limit/i.test(message)) {
    return 'Too many codes asked for. Wait a minute, then try again.';
  }
  if (code === 'email_address_invalid') return 'Enter a valid email address.';
  return message || 'Could not reach the sign-in service. Try again.';
}

/** Enter in a field acts like its button, without submitting a surrounding form. */
const onEnter = (action: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    action();
  }
};

/**
 * Sign in or create an account: Continue with Google, or a code emailed to you.
 * Not a <form>, so it can sit inside the checkout form.
 */
export function SignInOptions({ next, onSignedIn }: Props) {
  if (AUTH_MODE === 'dev') return <DevSignIn onSignedIn={onSignedIn} />;
  return <SupabaseSignIn next={next} onSignedIn={onSignedIn} />;
}

function SupabaseSignIn({ next, onSignedIn }: Props) {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'google' | 'send' | 'verify' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendAt <= now) return;
    const t = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(t);
  }, [resendAt, now]);

  async function google() {
    setBusy('google');
    setError(null);
    try {
      await signInWithGoogle(next);
      // The browser is on its way to Google; keep the button disabled until it leaves.
    } catch (err) {
      setError(friendly(err));
      setBusy(null);
    }
  }

  async function send(to: string) {
    if (!EMAIL_RE.test(to.trim())) return setError('Enter a valid email address.');
    setBusy('send');
    setError(null);
    try {
      await sendEmailCode(to);
      setSentTo(to.trim());
      setCode('');
      setResendAt(Date.now() + RESEND_WAIT_MS);
      setNow(Date.now());
      requestAnimationFrame(() => codeInput.current?.focus());
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(null);
    }
  }

  async function verify() {
    if (!sentTo) return;
    if (!CODE_RE.test(code)) return setError('Enter the code from the email (digits only).');
    setBusy('verify');
    setError(null);
    try {
      await verifyEmailCode(sentTo, code);
    } catch (err) {
      setBusy(null);
      return setError(friendly(err));
    }
    await onSignedIn();
    setBusy(null);
  }

  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const errorNote = error && (
    <p className="notice danger small" role="alert" style={{ margin: 0 }}>
      {error}
    </p>
  );

  if (sentTo) {
    return (
      <div className="stack" style={{ gap: 12 }}>
        <p className="small" style={{ margin: 0 }}>
          We emailed a sign-in code to <strong>{sentTo}</strong>. It can take a minute; check spam
          too.{' '}
          <button type="button" className="link" onClick={() => setSentTo(null)}>
            Change
          </button>
        </p>
        <div className="field">
          <label htmlFor="email-code">Code from the email</label>
          <input
            id="email-code"
            ref={codeInput}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_MAX}
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_MAX))}
            onKeyDown={onEnter(() => void verify())}
          />
        </div>
        {errorNote}
        <button type="button" disabled={busy !== null} onClick={() => void verify()}>
          {busy === 'verify' ? 'Checking…' : 'Continue'}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy !== null || wait > 0}
          onClick={() => void send(sentTo)}
        >
          {busy === 'send' ? 'Sending…' : wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        </button>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <button
        type="button"
        className="google-btn"
        disabled={busy !== null}
        onClick={() => void google()}
      >
        <GoogleMark />
        {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
      </button>
      <div className="or-divider" role="separator">
        or
      </div>
      <div className="field">
        <label htmlFor="signin-email">Email</label>
        <input
          id="signin-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={onEnter(() => void send(email))}
        />
      </div>
      {errorNote}
      <button
        type="button"
        className="secondary"
        disabled={busy !== null}
        onClick={() => void send(email)}
      >
        {busy === 'send' ? 'Sending…' : 'Email me a code'}
      </button>
    </div>
  );
}

/** TEMPORARY testing login (NEXT_PUBLIC_AUTH_MODE=dev): any email, no code. */
function DevSignIn({ onSignedIn }: Pick<Props, 'onSignedIn'>) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  function signIn() {
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address.');
    setDevUser(email);
    void onSignedIn();
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <p className="notice warn small" style={{ margin: 0 }}>
        Testing mode: enter any email to sign in instantly. No code is sent.
      </p>
      <div className="field">
        <label htmlFor="signin-email">Email</label>
        <input
          id="signin-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={onEnter(signIn)}
        />
      </div>
      {error && (
        <p className="notice danger small" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      <button type="button" onClick={signIn}>
        Sign in
      </button>
    </div>
  );
}

/** Google's "G" mark, as its sign-in branding guidelines require on the button. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
