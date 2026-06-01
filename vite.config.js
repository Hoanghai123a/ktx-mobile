import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const pocketBaseUrl = env.VITE_POCKETBASE_URL || env.VITE_HOST || 'https://ripple-skyrocket-progeny.ngrok-free.dev'
  const backendUrl = env.VITE_API_PROXY_TARGET || 'http://localhost:5000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/pb': {
          target: pocketBaseUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/pb/, ''),
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('xlsx')) return 'vendor-xlsx'
            if (id.includes('lucide-react')) return 'vendor-icons'
            return
          },
        },
      },
    },
  }
})

