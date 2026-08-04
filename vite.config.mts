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
        'react-router-dom',
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
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
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
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            // --- Heavy PDF / canvas libs (lazy, report-card screens only) ---
            // html2canvas is the largest piece — keep it separate from jspdf so
            // neither chunk crosses the size budget and each caches independently.
            if (id.includes('html2canvas')) return 'html2canvas';
            if (id.includes('jspdf-autotable')) return 'pdf-tables';
            if (id.includes('jspdf') || id.includes('html2pdf')) return 'pdf';
            // Charting
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            // Animation
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('date-fns')) return 'date-utils';
            // React core stays in its own chunk to maximize cache hits
            if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'react-vendor';
            // QR + crypto
            if (id.includes('qrcode') || id.includes('html5-qrcode')) return 'qr';
            // --- Split the heaviest remaining libs out of the generic vendor chunk ---
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('socket.io')) return 'realtime';
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('micromark') || id.includes('mdast') || id.includes('hast') || id.includes('unist')) return 'markdown';
            if (id.includes('read-excel-file') || id.includes('xlsx')) return 'xlsx';
            if (id.includes('formik') || id.includes('yup') || id.includes('zod')) return 'forms';
            if (id.includes('react-router') || id.includes('@remix-run')) return 'router';
            if (id.includes('dompurify')) return 'sanitize';
            if (id.includes('canvas-confetti') || id.includes('pako')) return 'fx';
            // Default: all other node_modules into a single 'vendor' chunk
            return 'vendor';
          },
        },
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react-native': 'react-native-web',
      }
    }
  };
});
