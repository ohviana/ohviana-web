import type { MetadataRoute } from 'next';

/** Android "Add to Home screen": name and the dark app icon (iOS uses apple-icon.png). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ohviana — Book trekking departures',
    short_name: 'Ohviana',
    start_url: '/',
    background_color: '#011e19',
    theme_color: '#011e19',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
