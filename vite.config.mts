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
  const isLowResourceBuild = process.env.LOW_RESOURCE_BUILD === 'true';
  const isDev = mode === 'development';

  return {
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: './setupTests.ts',
      testTimeout: 30000,
      hookTimeout: 20000,
      fileParallelism: false,
      exclude: [
        '**/node_modules/**', '**/dist/**', '**/tests/e2e/**', '**/backend/**',
        '**/*.spec.ts', '**/.kilo/**', '**/.{idea,git,cache,output,temp}/**',
      ],
    },
    cacheDir: '.vite',
    optimizeDeps: {
      // Keep dependency pre-bundling focused on dependencies used by the shell.
      // Heavy feature libraries are already split/lazy-loaded below.
      include: [
        'react', 'react-dom', 'react-dom/client', 'react/jsx-runtime',
        'react-router', '@tanstack/react-query', '@tanstack/react-query-persist-client',
        'date-fns', 'i18next', 'react-i18next', 'i18next-browser-languagedetector',
        'react-hot-toast',
      ],
      exclude: isDev ? ['recharts', 'framer-motion', 'socket.io-client', 'html2canvas', 'jspdf', 'html2pdf.js'] : [],
    },
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: ['host.docker.internal', 'localhost', '172.18.0.1'],
      warmup: {
        clientFiles: ['./index.tsx', './App.tsx', './components/auth/Login.tsx', './components/DashboardRouter.tsx'],
      },
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
        viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
        viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
      ]),
      VitePWA({
        registerType: 'prompt',
        devOptions: { enabled: true, type: 'module' },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        manifest: {
          name: 'Smart School Management App', short_name: 'SchoolApp',
          description: 'Complete school management system for students, teachers, parents and administrators. Works offline!',
          theme_color: '#4F46E5', background_color: '#ffffff', display: 'standalone',
          orientation: 'portrait-primary', start_url: '/', scope: '/',
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
      minify: 'esbuild', cssCodeSplit: true, reportCompressedSize: false,
      chunkSizeWarningLimit: 1150, sourcemap: false,
      rollupOptions: {
        output: {
          ...(isLowResourceBuild ? { maxParallelFileOps: 2 } : {}),
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('html2canvas')) return 'html2canvas';
            if (id.includes('jspdf-autotable')) return 'pdf-tables';
            if (id.includes('jspdf') || id.includes('html2pdf')) return 'pdf';
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('date-fns')) return 'date-utils';
            if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'react-vendor';
            if (id.includes('qrcode') || id.includes('html5-qrcode')) return 'qr';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('socket.io')) return 'realtime';
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('micromark') || id.includes('mdast') || id.includes('hast') || id.includes('unist')) return 'markdown';
            if (id.includes('read-excel-file') || id.includes('xlsx')) return 'xlsx';
            if (id.includes('formik') || id.includes('yup') || id.includes('zod')) return 'forms';
            if (id.includes('react-router') || id.includes('@remix-run')) return 'router';
            if (id.includes('dompurify')) return 'sanitize';
            if (id.includes('canvas-confetti') || id.includes('pako')) return 'fx';
            return 'vendor';
          },
        },
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: { '@': path.resolve(__dirname, '.') }
    }
  };
});
