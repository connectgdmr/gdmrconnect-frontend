import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Force production API through Cloudflare — overrides any Vercel dashboard env var
    'import.meta.env.VITE_API_URL': JSON.stringify('https://api.gdmrconnect.com/api'),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'icons':        ['react-icons'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
