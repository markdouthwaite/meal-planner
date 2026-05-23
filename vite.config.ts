import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon-master.svg'],
      manifest: {
        name: 'Family Meal Planner',
        short_name: 'Meal Planner',
        description: 'Plan weekly meals, manage recipes, generate shopping lists.',
        theme_color: '#16a34a',
        background_color: '#fafaf7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the built app shell + all hashed assets. Vite-PWA injects
        // the file list at build time.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // SPA fallback — any navigation that doesn't match a precached entry
        // falls back to index.html (so React Router routes work offline).
        navigateFallback: '/index.html',
        // With autoUpdate, claim+skip-waiting means new deploys take effect
        // on the next navigation without leaving stale tabs behind. Safe
        // because Vite's hashed asset names mean old bundles never get reused.
        clientsClaim: true,
        skipWaiting: true,
        // Runtime cache for the Inter font CDN so the lock screen still
        // renders its typography offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/rsms\.me\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'inter-font-cache',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Easier to test the PWA in dev. Disable if it gets in the way.
        enabled: false,
      },
    }),
  ],
})
