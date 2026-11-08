import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const versao = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

export default defineConfig({
  base: process.env.BASE ?? '/',
  define: { __VERSAO__: JSON.stringify(versao) },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mealheiro',
        short_name: 'Mealheiro',
        description: 'Regista os teus gastos e vê para onde vai o dinheiro.',
        lang: 'pt-PT',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0205',
        theme_color: '#0b0205',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'] },
    }),
  ],
  test: { environment: 'node' },
} as any);
