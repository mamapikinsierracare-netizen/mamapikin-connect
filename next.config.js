/** @type {import('next').NextConfig} */

// Try to load @ducanh2912/next-pwa first, fallback to next-pwa
let withPWA = (config) => config;
try {
  const pkg = require('@ducanh2912/next-pwa');
  withPWA = pkg.default({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
        handler: 'NetworkFirst',
        options: { cacheName: 'supabase-api', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 } },
      },
      {
        urlPattern: /\/_next\/static\/.*/,
        handler: 'CacheFirst',
        options: { cacheName: 'static-assets', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } },
      },
      {
        urlPattern: /\/$/,
        handler: 'NetworkFirst',
        options: { cacheName: 'page-home', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 } },
      },
      {
        urlPattern: /\/register|\/anc|\/pnc|\/immunisation/,
        handler: 'NetworkFirst',
        options: { cacheName: 'core-pages', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 } },
      },
    ],
  });
} catch (e) {
  // Fallback to next-pwa
  const nextPwa = require('next-pwa');
  withPWA = nextPwa({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
        handler: 'NetworkFirst',
        options: { cacheName: 'supabase-api', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 } },
      },
      {
        urlPattern: /\/_next\/static\/.*/,
        handler: 'CacheFirst',
        options: { cacheName: 'static-assets', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } },
      },
      {
        urlPattern: /\/$/,
        handler: 'NetworkFirst',
        options: { cacheName: 'page-home', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 } },
      },
      {
        urlPattern: /\/register|\/anc|\/pnc|\/immunisation/,
        handler: 'NetworkFirst',
        options: { cacheName: 'core-pages', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 } },
      },
    ],
  });
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = withPWA(nextConfig);