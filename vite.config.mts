import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version?: string };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Set by `npm run build:vps` for low-RAM production hosts: skips the
  // brotli/gzip compression passes (each re-reads and compresses every
  // output chunk in memory) and caps Rollup's concurrent file writes, so
  // the build finishes on boxes too small to run the full build pipeline.
  const isLowResourceBuild = process.env.LOW_RESOURCE_BUILD === 'true';
  return {
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: './setupTests.ts',
      testTimeout: 30000,
      hookTimeout: 20000,
      // Run test FILES one at a time. The backend integration suites all hit the same
      // Postgres instance through a small (5) connection pool; running many files in
      // parallel saturates the pool and makes DB-backed tests flaky. Serial files keep
      // the whole suite deterministic (tests within a file still run normally).
      fileParallelism: false,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/tests/e2e/**',
        // Backend integration tests require a live database + the backend tsconfig;
        // they run via their own tsx command, NOT the frontend (happy-dom) runner / CI.
        '**/backend/**',
        '**/*.spec.ts',
        '**/.kilo/**',
        '**/.{idea,git,cache,output,temp}/**',
      ],
    },
    cacheDir: '.vite',
    // Pre-bundle the heavy, always-used dependencies up front so the FIRST page load
    // doesn't trigger on-the-fly discovery + a mid-session re-optimize (which forces a
    // full browser reload). Combined with NOT wiping the .vite cache on every start
    // (see package.json), warm restarts load fast.
    optimizeDeps: {
      include: [
        'react', 'react-dom', 'react-dom/client', 'react/jsx-runtime',
        'react-router',
        '@tanstack/react-query', '@tanstack/react-query-persist-client',
        'recharts',
        'framer-motion',
        'lucide-react',
        'date-fns',
        'i18next', 'react-i18next', 'i18next-browser-languagedetector',
        'socket.io-client',
        'dompurify',
        'react-hot-toast',
      ],
    },
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: ['host.docker.internal', 'localhost', '172.18.0.1'],
      // Pre-transform the entry + the login and role dashboards while the dev server
      // boots, so the first navigation paints sooner instead of compiling on click.
      warmup: {
        clientFiles: [
          './index.tsx',
          './App.tsx',
          './components/auth/Login.tsx',
          './components/DashboardRouter.tsx',
        ],
      },
      // Follow the port the backend actually binds — backend/src/config/env.ts
      // resolves BACKEND_PORT || PORT || 5000, so this must resolve it the same
      // way rather than hardcoding 5000.
      //
      // `vite preview` inherits this block (preview.proxy defaults to
      // server.proxy), and the E2E workflow runs the backend on BACKEND_PORT
      // 5099. With 5000 hardcoded, every proxied /api call in that suite died
      // with "[vite] http proxy error" while the backend sat healthy on 5099 —
      // which is what failed all 9 critical-path tests once the suite finally
      // got far enough to run.
      proxy: {
        '/api': {
          target: `http://localhost:${process.env.BACKEND_PORT || process.env.PORT || 5000}`,
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [
      react(),
      ...(isLowResourceBuild ? [] : [
        viteCompression({
          algorithm: 'brotliCompress',
          ext: '.br',
          threshold: 1024,
        }),
        viteCompression({
          algorithm: 'gzip',
          ext: '.gz',
          threshold: 1024,
        }),
      ]),
      VitePWA({
        registerType: 'prompt',
        // Without this, vite-plugin-pwa only generates/registers a service worker
        // in a production build — the dev server never meets Chrome's installability
        // criteria, so the browser never fires beforeinstallprompt and the Install
        // button silently falls back to manual "Add to Home Screen" steps even
        // though the real one-tap install works fine once deployed. Enabling it
        // here makes the dev preview behave the same as production.
        devOptions: {
          enabled: true,
          type: 'module',
        },
        workbox: {
          // Do not download every lazy route and heavy library during service
          // worker installation. They are cached on first visit below, so a
          // slow connection only transfers the shell and the page being used.
          globPatterns: ['**/*.{css,html,ico,png,svg,webp,json}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /\.(?:js|css)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'app-assets',
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        // A valid, installable manifest. Chrome requires a 192px AND a 512px PNG
        // icon (the previous config shipped only vite.svg, which failed install
        // criteria so beforeinstallprompt never fired). A separate "maskable" icon
        // gives Android an adaptive icon without cropping the "any" one.
        manifest: {
          name: 'Smart School Management App',
          short_name: 'SchoolApp',
          description: 'Complete school management system for students, teachers, parents and administrators. Works offline!',
          theme_color: '#4F46E5',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icons/app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        }
      })
    ],
    envPrefix: 'VITE_', 
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'process.env.APP_VERSION': JSON.stringify(env.VITE_APP_VERSION || process.env.npm_package_version || packageJson.version || '0.5.38')
    },
    build: {
      minify: 'esbuild',
      cssCodeSplit: true,
      reportCompressedSize: false,
      // 1150 KB budget: every EAGER chunk sits well under this. The only chunk that
      // approaches it is `pdf` (jspdf core ships its own embedded fonts — one
      // indivisible library), and it is lazy-loaded only on report/certificate
      // screens and brotli-compresses to ~295 KB. So this is a deliberate budget for
      // a known, isolated, on-demand chunk — not a blanket warning suppression.
      chunkSizeWarningLimit: 1150,
      sourcemap: false,
      rollupOptions: {
        output: {
          // Caps concurrent chunk writes so the build doesn't hold as many
          // output buffers in memory at once — only meaningfully matters on
          // a RAM-constrained host, so it's scoped to the low-resource build.
          ...(isLowResourceBuild ? { maxParallelFileOps: 2 } : {}),
          // No manualChunks on purpose. Bucketing node_modules by id.includes()
          // ignores the real import graph: a bucket becomes EAGER as soon as any
          // eagerly-reachable module touches one file in it. That is how the
          // login path ended up preloading `markdown` (react-markdown/remark,
          // AI-chat only) and `realtime` (socket.io) — 1.7 MB of eager JS — and
          // how the realtime bucket formed an import cycle with vendor.
          // Rollup's default splitting follows actual reachability, so lazy
          // routes keep their own chunks and the login shell stays small.
        },
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
