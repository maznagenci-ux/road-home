import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ZMKH Road Home',
    short_name: 'ZMKH Road Home',
    description: 'Real Estate & Construction Financial Management',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1220',
    theme_color: '#249B8A',
    lang: 'ckb',
    icons: [
      { src: '/brand/logo-64.png', sizes: '64x64', type: 'image/png' },
      { src: '/brand/logo-256.png', sizes: '256x256', type: 'image/png' },
    ],
  };
}
