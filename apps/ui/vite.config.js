import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      restoreMocks: true,
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:5000',
          changeOrigin: true,
          configure(proxy) {
            proxy.on('proxyRes', (proxyResponse) => {
              delete proxyResponse.headers['www-authenticate']
            })
          },
        },
      },
    },
  }
})
