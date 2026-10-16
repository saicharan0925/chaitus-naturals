import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import HeadlineBanner from '@/components/HeadlineBanner';
import Footer from '@/components/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chaitus-naturals.pages.dev';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Chaitu's Naturals | Handmade Herbal Hair & Skin Care",
  description:
    "Chaitu's Naturals — handmade herbal hair oils, skin care, soaps, lip balms, neem combs and loofah. Small-batch, natural, made with love. Order on WhatsApp.",
  keywords: [
    "Chaitu's Naturals",
    'chaitus naturals',
    'handmade herbal hair oil',
    'neem comb',
    'herbal skin care',
    'handmade soap',
    'herbal lip balm',
  ],
  authors: [{ name: "Chaitu's Naturals" }],
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: "Chaitu's Naturals",
    title: "Chaitu's Naturals | Handmade Herbal Hair & Skin Care",
    description:
      "Handmade herbal hair & skin care, soaps, lip balms, neem combs and loofah. Order easily on WhatsApp.",
    images: [{ url: '/og-cover.svg', width: 1200, height: 630, alt: "Chaitu's Naturals — handmade herbal care" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Chaitu's Naturals | Handmade Herbal Hair & Skin Care",
    description: 'Handmade herbal hair & skin care. Order easily on WhatsApp.',
    images: ['/og-cover.svg'],
  },
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // LocalBusiness structured data (JSON-LD) for Google visibility
  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: "Chaitu's Naturals",
    description: 'Handmade herbal hair care, skin care, soaps, lip balms, neem combs and loofah.',
    url: SITE_URL,
    telephone: '+91-7396345773',
    sameAs: ['https://www.instagram.com/chaitus_naturals'],
    priceRange: '₹₹',
  };
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />
        <HeadlineBanner />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
