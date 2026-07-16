import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Load env file based on `mode`. Priority: process.env > env files
  const env = loadEnv(mode, process.cwd(), '');
  
  const isGitHubPages = process.env.GITHUB_PAGES === 'true' || env.GITHUB_PAGES === 'true';
  const repoName = process.env.REPO_NAME || env.REPO_NAME || 'Frido-Master-Dashboard';
  const isStaffApp = process.env.VITE_APP_TYPE === 'STAFF' || env.VITE_APP_TYPE === 'STAFF';
  const appBase = isGitHubPages
    ? (isStaffApp ? `/${repoName}/staff/` : `/${repoName}/`)
    : '/';
  const startUrl = appBase;
  const appName = isStaffApp ? 'Frido Staff Dashboard' : 'Frido Master Dashboard';

  return {
    base: appBase,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['frido-favicon.png'],
        manifest: {
          name: appName,
          short_name: isStaffApp ? 'Frido Staff' : 'Frido',
          description: 'Frido dashboard for operations, analytics, and team workflows.',
          theme_color: '#0a0e1a',
          background_color: '#0e1116',
          display: 'standalone',
          start_url: startUrl,
          scope: appBase,
          icons: [
            {
              src: 'frido-favicon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'frido-favicon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          navigateFallback: `${appBase}index.html`,
          navigateFallbackDenylist: [
            /^\/api/,
            /^\/orm-dashboard/,
            /^\/fes-sm-dashboard/,
            /^\/exec-dashboard/,
            /^\/isd-nm/,
            /^\/ist-console/,
            /^\/retail-feedback/,
            /^\/retail-staff/,
            /^\/salary-analysis/
          ],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
      }),
    ],
    server: {
      port: 3005,
      open: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      include: ['src/**/*.{test,spec}.{js,jsx}', 'server/**/*.{test,spec}.{js,jsx}'],
      env: {
        // ClerkProvider requires a non-empty publishable key shape in tests / CI without repo .env.
        VITE_CLERK_PUBLISHABLE_KEY:
          process.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_00000000000000000000000000000000',
        VITE_DEMO_MODE: 'false',
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'src/test/'],
      },
    },
  };
});
