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
  return {
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: './setupTests.ts',
      testTimeout: 30000,
      hookTimeout: 20000,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/tests/e2e/**',
        '**/*.spec.ts',
        '**/.kilo/**',
        '**/.{idea,git,cache,output,temp}/**',
      ],
    },
    cacheDir: '.vite',
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: ['host.docker.internal', 'localhost', '172.18.0.1'],
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
      VitePWA({
        registerType: 'prompt',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        manifest: {
          name: 'Smart School Management App',
          short_name: 'SchoolApp',
          description: 'Complete school management system for students, teachers, parents and administrators. Works offline!',
          theme_color: '#4F46E5',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'vite.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            }
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
      chunkSizeWarningLimit: 1000,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            // Heavy PDF / canvas libs — isolate so they only load on report-card screens
            if (id.includes('jspdf') || id.includes('html2pdf') || id.includes('html2canvas')) return 'pdf';
            // Charting
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            // Date / forms / animation utilities
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('date-fns')) return 'date-utils';
            // React core stays in its own chunk to maximize cache hits
            if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'react-vendor';
            // Supabase + auth
            if (id.includes('@supabase')) return 'supabase';
            // QR + crypto
            if (id.includes('qrcode') || id.includes('html5-qrcode')) return 'qr';
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
