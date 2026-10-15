/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: no server, no API routes. Output goes to ./out for Cloudflare Pages.
  output: 'export',
  reactStrictMode: true,
  poweredByHeader: false,
  // Cloudflare Pages has no Next Image optimizer, so serve plain <img> via unoptimized.
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  trailingSlash: true,
};

export default nextConfig;
