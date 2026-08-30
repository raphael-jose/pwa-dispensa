import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

const base = '/pwa-dispensa/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      base,
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Despensa - Controle de Estoque',
        short_name: 'Despensa',
        description: 'Controle inteligente de despensa com leitor de código de barras',
        theme_color: '#059669',
        background_color: '#f9fafb',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/pwa-dispensa/',
        start_url: '/pwa-dispensa/',
        icons: [
          { src: '/pwa-dispensa/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-dispensa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/raphael-jose\.github\.io\/pwa-dispensa\/?$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3
            }
          },
          {
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'openfoodfacts-cache',
              expiration: { maxEntries: 500, maxAgeSeconds: 86400 }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
});
