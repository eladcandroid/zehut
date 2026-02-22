import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'זהות | מרכז התוכן לפעילים',
    short_name: 'זהות',
    description: 'מרכז התוכן הרשמי של תנועת זהות ומשה פייגלין',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2b7eb5',
    dir: 'rtl',
    lang: 'he',
    icons: [
      {
        src: '/zehut-logo.png',
        sizes: '400x300',
        type: 'image/png',
      },
    ],
  };
}
