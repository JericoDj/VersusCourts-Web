import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'https://versuscourts-backend-production.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
