import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const apiTarget = (env.VITE_API_TARGET || 'http://localhost:8000').replace(/["']/g, '').replace(/\/+$/, '');
  const isMockBuild = env.VITE_APP_MODE === 'mock' || mode === 'mock';
  const explicitBasePath = process.env.VITE_BASE_PATH;
  const basePath = isMockBuild ? explicitBasePath || '/zalalal/' : env.VITE_BASE_PATH || '/';
  const enablePwa = isMockBuild || env.VITE_ENABLE_PWA === 'true';
  const pwaBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

  return {
  base: basePath,
  plugins: [
    react(),
    enablePwa && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'VoltMarket',
        short_name: 'VoltMarket',
        description: 'Маркетплейс электронной техники',
        theme_color: '#005bff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: pwaBasePath,
        scope: pwaBasePath,
        icons: [
          {
            src: `${pwaBasePath}icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: `${pwaBasePath}icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 3600
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    }),
    basicSsl() // Плагин сам включает HTTPS
  ].filter(Boolean),
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/'
      },
      '/minio': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/minio/, '')
      }
    },
    host: true
    // ❌ Убрали `https: true` — плагин basicSsl() уже обрабатывает HTTPS
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          ui: ['axios', 'bootstrap', 'react-bootstrap']
        }
      }
    }
  }
  };
});
