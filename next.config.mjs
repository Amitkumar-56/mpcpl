import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config options here
};

// Suppress GenerateSW warnings in development (harmless warning from next-pwa/workbox)
// This warning occurs because webpack watch mode regenerates the service worker multiple times
// It doesn't affect functionality, but we can suppress it for cleaner logs
if (process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0]?.toString() || '';
    if (message.includes('GenerateSW') || message.includes('workbox')) {
      return; // Suppress GenerateSW warnings
    }
    originalWarn.apply(console, args);
  };
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false, // Keep PWA enabled
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
  // Note: sw.js file locking errors on Windows are harmless - PWA still works
  // The file is auto-generated and added to .gitignore
})(nextConfig);