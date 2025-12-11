/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  // Increase body size limit for large PO data (50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Disable image optimization to serve static files directly
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
