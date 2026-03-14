/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disabled to avoid duplicate API calls on initial load (Strict Mode double-mounts in dev)
  reactStrictMode: false,
  output: 'standalone',
  images: {
    domains: ['localhost', 'ui-avatars.com'],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/:path*`
          : 'http://localhost:3001/:path*',
      },
    ];
  },
  async redirects() {
    return [
      { source: '/tools', destination: '/items', permanent: true },
      { source: '/tool-categories', destination: '/item-categories', permanent: true },
    ];
  },
};

module.exports = nextConfig;
