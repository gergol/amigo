import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

const commit = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'unbekannt' }
})()

export default defineConfig({
  // '/' locally; the CI workflow passes BASE_PATH=/<repo>/ for the GitHub Pages subpath.
  base: process.env.BASE_PATH || '/',
  define: { __COMMIT__: JSON.stringify(commit) },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/*.woff2', 'icons/*'],
      manifest: {
        name: 'amigo — Spanisch A1/A2',
        short_name: 'amigo',
        lang: 'de',
        description: 'Spaced-repetition Spanisch-Trainer für Deutschsprachige.',
        theme_color: '#b68235',
        background_color: '#f3f2f2',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // everything is static and offline-by-design → precache it all
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,json}'],
      },
    }),
  ],
})
