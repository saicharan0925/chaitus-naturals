import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chaitusnaturals.pages.dev';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  // Static pages. Product pages live at /product?slug=... and are rendered
  // client-side (so new products work without a rebuild); crawlers discover
  // them via the home page grid.
  return [
    { url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
  ];
}
