import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: './setupTests.ts',
      testTimeout: 30000,
      hookTimeout: 20000,
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
      // ... (existing compression/PWA plugins)
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
          runtimeCaching: [
          ]
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
    // Lead DevSecOps: Strict environment isolation
    envPrefix: 'VITE_', 
    define: {
      // Only map specific keys that MUST be available globally, 
      // ensuring they are sourced from VITE_ prefixed variables only.
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
    },
    build: {
      minify: 'esbuild',
      cssCodeSplit: true,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-core';
              }
              if (id.includes('framer-motion')) {
                return 'vendor-animation';
              }
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html2pdf')) {
                return 'vendor-pdf';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              return 'vendor-others';
            }
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
