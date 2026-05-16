import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Flowy',
    short_name: 'Flowy',
    start_url: '/dashboard',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    theme_color: '#f6f7f9',
    background_color: '#f6f7f9',
    display: 'standalone',
    orientation: 'portrait',
  };
}
