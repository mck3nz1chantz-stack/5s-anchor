import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/** GitHub project pages: https://<user>.github.io/5s-anchor/ */
const base = process.env.GITHUB_PAGES === 'true' ? '/5s-anchor/' : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '5S Anchor',
        short_name: '5S Anchor',
        description: 'Shop-floor 5S/6S guide — red tags, audits, sustain.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,woff2}'],
        navigateFallback: `${base}index.html`.replace(/\/+/g, '/'),
      },
    }),
  ],
  server: {
    host: true,
    port: 5175,
  },
})

