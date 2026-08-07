import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    host: true,   // listen on 0.0.0.0 so your phone can reach it
    port: 5173,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Emergency Rescue App',
        short_name: 'Rescue',
        description: 'Emergency rescue and response application',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ff3b3b',
        orientation: 'portrait',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        // Cache the app shell navigation routes
        navigateFallback: '/index.html',
        // Pre-cache all static Vite build assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Network-first for API calls so data is always fresh
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rescue-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
            },
          },
          {
            // Cache-first for external CDN resources (A-Frame, AR.js)
            urlPattern: /^https:\/\/(aframe\.io|cdn\.jsdelivr\.net|unpkg\.com)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'rescue-cdn-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
          {
            // Stale-while-revalidate for Leaflet map tiles
            urlPattern: /^https:\/\/[a-z]\.tile\.openstreetmap\.org\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'rescue-map-tiles',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 24 * 60 * 60, // 1 day
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    globals: true,
  },
});

