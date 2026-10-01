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

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isLowResourceBuild = process.env.LOW_RESOURCE_BUILD === 'true';
  return {
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: './setupTests.ts',
      testTimeout: 30000,
      hookTimeout: 20000,
      fileParallelism: false,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/tests/e2e/**',
        '**/backend/**',
        '**/*.spec.ts',
        '**/.kilo/**',
        '**/.{idea,git,cache,output,temp}/**',
      ],
    },
    cacheDir: '.vite',
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
          target: `http://localhost:${process.env.BACKEND_PORT || process.env.PORT || 5000}`,
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [
      react(),
      // APP_VERSION is inlined from package.json in `define` below, which Vite
      // evaluates once when the dev server starts. A version bump while the
      // server keeps running therefore leaves the browser on a bundle stamped
      // with the OLD number while the backend (tsx watch restarts it) registers
      // the NEW one — the app then shows a mandatory "System Update Required"
      // that no reload can satisfy, because the dev server keeps serving the
      // same stale constant. Vite already restarts itself when the config or
      // .env files change; package.json belongs in that set for the same reason.
      {
        name: 'oliskey:restart-on-package-json-change',
        apply: 'serve',
        configureServer(server) {
          const packageJsonPath = path.resolve(__dirname, 'package.json');
          server.watcher.add(packageJsonPath);
          server.watcher.on('change', (changed) => {
            if (path.resolve(changed) === packageJsonPath) {
              server.config.logger.info('package.json changed — restarting dev server so APP_VERSION is re-read', { timestamp: true });
              server.restart();
            }
          });
        },
      },
      ...(process.env.ANALYZE_BUNDLE === 'true' ? [(await import('rollup-plugin-visualizer')).visualizer({
        filename: 'bundle-analysis.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      })] : []),
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
        devOptions: {
          enabled: true,
          type: 'module',
        },
        workbox: {
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
    // esbuild is a TOP-LEVEL Vite option (it also drives the dev server's own
    // transform), not a build.esbuild sub-key — nesting it under build would
    // silently do nothing. Scoped to production so `npm run dev` keeps normal
    // console output. `pure` (not `drop: ['console']`) so error reporting
    // survives: it marks log/debug/info/warn calls as side-effect-free so
    // esbuild's minifier removes them, while leaving console.error alone.
    esbuild: mode === 'production' ? {
      drop: ['debugger'],
      pure: ['console.log', 'console.debug', 'console.info', 'console.warn'],
    } : undefined,
    define: {
      // No AI key is inlined into the bundle. Vite inlines any VITE_* value it
      // is given, so defining the Gemini key here shipped it to every browser;
      // AI calls go through the server-side /api/ai proxy instead
      // (see lib/ai.ts getAIClient).
      // package.json is read afresh on every (re)start; npm_package_version is
      // stamped into the environment once by npm/npx at process launch and is
      // still the OLD number after the restart-on-package.json-change plugin
      // above re-resolves this config, so it must not shadow the file.
      'process.env.APP_VERSION': JSON.stringify(env.VITE_APP_VERSION || packageJson.version || process.env.npm_package_version || '0.5.38')
    },
    build: {
      minify: 'esbuild',
      cssCodeSplit: true,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1150,
      sourcemap: false,
      rollupOptions: {
        output: {
          ...(isLowResourceBuild ? { maxParallelFileOps: 2 } : {}),
          // Split ONLY the React core, and let Rollup decide everything else.
          //
          // The previous config bucketed all of node_modules by id.includes().
          // That ignores the real import graph, and a bucket turns EAGER the
          // moment anything eagerly reachable touches a single file in it — so
          // the login path preloaded `markdown` (react-markdown/remark, used
          // only by AI chat) and `realtime` (socket.io), 1738 KB of eager JS
          // across 9 chunks, and the realtime bucket formed an import cycle
          // with vendor.
          //
          // React is different: it is genuinely eager on every route, so giving
          // it its own chunk cannot drag anything onto the critical path, and it
          // is the most stable code in the bundle — keeping it separate means an
          // app deploy does not invalidate it in the browser cache. Every other
          // dependency is left to Rollup, which follows actual reachability and
          // keeps lazy routes in their own chunks.
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
              return 'react-vendor';
            }
            // Every lucide icon is its own ES module, so Rollup's default
            // "follow the import graph" chunking (deliberately kept for
            // everything else, see above) splits each one imported from 2+
            // places into its OWN tiny chunk — dozens of ~300-400 byte
            // requests, each a full HTTP round trip. Icons are used
            // everywhere, so bucketing just this one package into a single
            // shared chunk collapses that fragmentation without touching the
            // per-route splitting for anything else (markdown, socket.io,
            // etc. stay lazy exactly as before).
            if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) {
              return 'icons';
            }
          },
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
