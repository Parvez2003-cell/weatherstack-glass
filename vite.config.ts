import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Explicitly load .env so API key is available in proxy (Vite doesn't always expose it to config)
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = (env.VITE_WEATHERSTACK_KEY || env.WEATHERSTACK_KEY || '').trim()

  const proxyApiKey = apiKey && apiKey !== 'PASTE_YOUR_WEATHERSTACK_KEY_HERE' ? apiKey : null

  if (!proxyApiKey) {
    console.warn(
      '[vite] Weatherstack API key not found. Create a .env file with VITE_WEATHERSTACK_KEY=your_key and restart.',
    )
  } else {
    console.log('[vite] Weatherstack API key loaded for /api proxy.')
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/weather': {
          target: 'https://api.weatherstack.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/weather/, '/current'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              if (!proxyApiKey) return
              // req.url is e.g. "/api/weather?query=London&units=m" - get query and add access_key
              const url = new URL(req.url || '', 'http://localhost')
              const params = new URLSearchParams(url.search)
              params.set('access_key', proxyApiKey)
              proxyReq.path = '/current?' + params.toString()
            })
          },
        },
        '/api/historical': {
          target: 'https://api.weatherstack.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/historical/, '/historical'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              if (!proxyApiKey) return
              const url = new URL(req.url || '', 'http://localhost')
              const params = new URLSearchParams(url.search)
              params.set('access_key', proxyApiKey)
              proxyReq.path = '/historical?' + params.toString()
            })
          },
        },
        '/api/marine': {
          target: 'https://api.weatherstack.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/marine/, '/marine'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              if (!proxyApiKey) return
              const url = new URL(req.url || '', 'http://localhost')
              const params = new URLSearchParams(url.search)
              params.set('access_key', proxyApiKey)
              proxyReq.path = '/marine?' + params.toString()
            })
          },
        },
      },
    },
  }
})
