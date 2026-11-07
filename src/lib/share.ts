import { CONFIGURED_SITE_URL } from './env';

/** Public URL customers open from WhatsApp/Instagram for a direct-link token. */
export function shareUrl(token: string): string {
  const site = CONFIGURED_SITE_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${site}/b/${token}`;
}
