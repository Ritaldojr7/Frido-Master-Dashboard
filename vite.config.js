import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  const isGitHubPages = env.GITHUB_PAGES === 'true';
  const repoName = env.REPO_NAME || 'Frido-Master-Dashboard';
  const isStaffApp = env.VITE_APP_TYPE === 'STAFF';

  return {
    base: isGitHubPages 
      ? (isStaffApp ? `/${repoName}/staff/` : `/${repoName}/`)
      : '/',
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
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
      include: ['src/**/*.{test,spec}.{js,jsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'src/test/'],
      },
    },
  };
});
