import type { PhotoCategory } from '@ohviana/shared';
import { API_BASE_URL } from './env';

/** Photo URLs come from the API as paths; images are served by the API. */
export function mediaUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** An organizer logo: an https link as given, or an uploaded one (API path). */
export function logoSrc(url: string): string {
  return url.startsWith('/') ? mediaUrl(url) : url;
}

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  destination: 'Destination',
  trail: 'Trail',
  transport: 'Transport',
  stay: 'Stay',
  food: 'Food',
  group: 'Group',
  other: 'Other',
};
