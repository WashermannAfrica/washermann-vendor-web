import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest. Makes the vendor portal installable as a PWA.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Washermann Vendor',
    short_name: 'Washermann',
    description:
      'Manage your laundry business, bookings and logistics with Washermann.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#00281c',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
