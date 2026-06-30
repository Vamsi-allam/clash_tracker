import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const cocToken = env.COC_API_TOKEN || env.VITE_COC_API_TOKEN

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/coc': {
          target: 'https://api.clashofclans.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/coc/, '/v1'),
          headers: cocToken
            ? {
                Authorization: `Bearer ${cocToken}`,
              }
            : undefined,
        },
        '/api/assets': {
          target: 'https://api-assets.clashofclans.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/assets/, ''),
        },
      },
    },
  }
})
