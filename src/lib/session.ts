'use client';

import { OtpSendResponse, SessionResponse } from '@ohviana/contracts';
import { apiFetch } from './api';
import { getSupabase } from './supabase';

/**
 * How people sign in (NEXT_PUBLIC_AUTH_MODE):
 *  - `supabase` — Continue with Google, or a code emailed through Supabase (Brevo SMTP).
 *  - `dev`      — TEMPORARY local testing: email only, no code (API AUTH_MODE=dev).
 * Separately, a phone + SMS code (an Ohviana API session) proves the mobile a traveller went on a
 * trip with, for reviews, and lets trip leads open the departures they lead.
 */
export type AuthMode = 'supabase' | 'dev';
export const AUTH_MODE: AuthMode = process.env.NEXT_PUBLIC_AUTH_MODE === 'dev' ? 'dev' : 'supabase';

const PHONE_SESSION_KEY = 'ohviana:session';
const DEV_USER_KEY = 'ohviana:dev-user';
const AUTH_EVENT = 'ohviana:auth-change';

interface PhoneSession {
  accessToken: string;
  expiresAt: string;
  email: string | null;
  phone?: string | null;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function notify(): void {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode): the session lasts for this page only.
  }
  notify();
}

function phoneSession(): PhoneSession | null {
  const s = read<PhoneSession>(PHONE_SESSION_KEY);
  if (!s) return null;
  // Treat as expired a minute early so requests never race the expiry.
  return Date.parse(s.expiresAt) - 60_000 > Date.now() ? s : null;
}

// ---------- Google and email code (Supabase) ----------

/** Leaves for Google; Supabase returns to /auth/callback, which continues to `next`. */
export async function signInWithGoogle(next: string): Promise<void> {
  const callback = new URL('/auth/callback', window.location.origin);
  callback.searchParams.set('next', next);
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.toString() },
  });
  if (error) throw error;
}

/** Emails a sign-in code (creating the account on first use). */
export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const { error } = await getSupabase().auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: 'email',
  });
  if (error) throw error;
  notify();
}

// ---------- Phone + SMS code (reviews, trip leads) ----------

/** Texts a 6-digit sign-in code to `phone` (E.164). */
export const sendPhoneCode = (phone: string) =>
  apiFetch('/v1/auth/otp/send', OtpSendResponse, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone }),
  });

export async function signInWithPhoneCode(phone: string, code: string) {
  const session = await apiFetch('/v1/auth/otp/verify', SessionResponse, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  write(PHONE_SESSION_KEY, {
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
    email: session.user.email,
    phone: session.user.phone,
  } satisfies PhoneSession);
  return session;
}

// ---------- Dev mode ----------

/** Dev mode: "sign in" as this email (or sign out with null). */
export function setDevUser(email: string | null): void {
  try {
    if (email) localStorage.setItem(DEV_USER_KEY, email.trim().toLowerCase());
    else localStorage.removeItem(DEV_USER_KEY);
  } catch {
    // ignore
  }
  notify();
}

function devUser(): string | null {
  try {
    return localStorage.getItem(DEV_USER_KEY);
  } catch {
    return null;
  }
}

// ---------- Mode-agnostic API used by pages ----------

/** The Google / email-code (or dev) sign-in, if any. */
async function mainHeader(): Promise<Record<string, string>> {
  if (AUTH_MODE === 'dev') {
    const email = devUser();
    return email ? { 'x-dev-user': email } : {};
  }
  try {
    const { data } = await getSupabase().auth.getSession();
    return data.session ? { authorization: `Bearer ${data.session.access_token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Credentials for the signed-in person, or {} for guests. Never throws. The Google / email-code
 * account comes first, so verifying a phone for a review never swaps an organizer out of their
 * account; `{ phone: true }` (review calls) prefers the phone sign-in, which proves the number.
 */
export async function authHeader(opts: { phone?: boolean } = {}): Promise<Record<string, string>> {
  const phone = phoneSession();
  const phoneHeader: Record<string, string> = phone
    ? { authorization: `Bearer ${phone.accessToken}` }
    : {};
  if (opts.phone && phone) return phoneHeader;
  const main = await mainHeader();
  return Object.keys(main).length > 0 ? main : phoneHeader;
}

export async function isSignedIn(): Promise<boolean> {
  return Object.keys(await authHeader()).length > 0;
}

/** Email of the signed-in person, when there is one. */
export async function signedInEmail(): Promise<string | null> {
  if (AUTH_MODE === 'dev') return devUser() ?? phoneSession()?.email ?? null;
  try {
    const { data } = await getSupabase().auth.getSession();
    if (data.session) return data.session.user.email ?? null;
  } catch {
    // Supabase not configured: fall through to a phone sign-in.
  }
  return phoneSession()?.email ?? null;
}

/** Calls `cb` whenever the user signs in or out. Returns an unsubscribe function. */
export function onAuthChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(AUTH_EVENT, handler);
  window.addEventListener('storage', handler);
  const unlisten = () => {
    window.removeEventListener(AUTH_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
  if (AUTH_MODE !== 'supabase') return unlisten;
  try {
    const { data } = getSupabase().auth.onAuthStateChange(() => cb());
    return () => {
      unlisten();
      data.subscription.unsubscribe();
    };
  } catch {
    return unlisten;
  }
}

/** Signs out of everything on this device: the main sign-in and any phone sign-in. */
export async function signOut(): Promise<void> {
  write(PHONE_SESSION_KEY, null);
  if (AUTH_MODE === 'dev') return setDevUser(null);
  try {
    await getSupabase().auth.signOut();
  } catch {
    // Not configured: nothing to sign out of.
  }
}

const TOKEN_PREFIX = 'ohviana:booking-token:';

/**
 * Guest booking access tokens live in this browser so the confirmation page keeps working.
 * Storage can be unavailable (private mode); callers must cope with null.
 */
export function rememberBookingToken(reference: string, token: string): void {
  try {
    localStorage.setItem(TOKEN_PREFIX + reference, token);
  } catch {
    // ignore
  }
}

export function recallBookingToken(reference: string): string | null {
  try {
    return localStorage.getItem(TOKEN_PREFIX + reference);
  } catch {
    return null;
  }
}
