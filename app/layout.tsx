import type { Metadata, Viewport } from "next";
import { Heebo, Geist_Mono } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = 'זהות | מרכז התוכן לפעילים';
const siteDescription = 'מרכז התוכן הרשמי של תנועת זהות ומשה פייגלין – סרטונים, כתבות ותכנים לפעילים ותומכים. גלו, שתפו והפיצו.';
const siteUrl = 'https://zehut.vercel.app';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2b7eb5',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: '%s | זהות',
  },
  description: siteDescription,
  keywords: [
    'זהות', 'משה פייגלין', 'תנועת זהות', 'מפלגת זהות', 'פייגלין',
    'חמש על חמש', 'ליברליזם', 'חירות', 'ישראל', 'פוליטיקה ישראלית',
    'Zehut', 'Moshe Feiglin',
  ],
  authors: [{ name: 'תנועת זהות' }],
  creator: 'תנועת זהות',
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDescription,
    images: [
      {
        url: '/zehut-logo.png',
        width: 400,
        height: 300,
        alt: 'זהות – תנועה ישראלית יהודית',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: siteName,
    description: siteDescription,
    images: ['/zehut-logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'תנועת זהות',
    url: siteUrl,
    logo: `${siteUrl}/zehut-logo.png`,
    description: siteDescription,
    sameAs: [
      'https://www.youtube.com/@Aborgen',
      'https://www.facebook.com/MosheFeiglin',
    ],
  };

  return (
    <html lang="he" dir="rtl">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${heebo.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
