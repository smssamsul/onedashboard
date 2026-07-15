/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize build performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // External packages for server-side (required for sharp on Vercel)
  serverExternalPackages: ['sharp'],

  // Code splitting optimization
  experimental: {
    optimizeCss: true,
  },

  // Turbopack config to silence warning
  turbopack: {},

  // Webpack configuration to handle WebSocket HMR
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Suppress WebSocket connection errors in development
      config.ignoreWarnings = [
        { module: /node_modules/ },
        { message: /WebSocket connection/i },
      ];
    }
    return config;
  },

  async rewrites() {
    // Backend URL - Menggunakan environment variable
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    return [
      // Biarkan route internal Next (gateway) tetap di-handle oleh Next.js
      {
        source: "/api/webinar/gateway/:path*",
        destination: "/api/webinar/gateway/:path*",
      },
      // Exclude /api/login from rewrite - it should use Next.js API route handler
      {
        source: "/api/login",
        destination: "/api/login",
      },
      // Rewrite other API routes to backend
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/product/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
        ],
      },
      {
        source: '/article/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;