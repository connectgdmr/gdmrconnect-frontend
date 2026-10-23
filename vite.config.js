import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Sales-demo build: set VITE_BRAND=aieque (and VITE_API_URL=<demo backend>/api) on the demo Vercel project.
// Normal builds leave VITE_BRAND unset and none of the demo swaps below are applied.
const DEMO = process.env.VITE_BRAND === 'aieque'
const DEMO_API = process.env.VITE_API_URL || ''
const DEMO_BASE = DEMO_API.replace(/\/api\/?$/, '')

function aiequeBrand() {
  return {
    name: 'aieque-brand',
    enforce: 'pre',
    transform(code, id) {
      if (!/[\/]src[\/].*\.(jsx?|css)$/.test(id)) return null
      let out = code
      // names (order matters: longest first). The logo file name is protected, the logo itself is swapped by the alias below.
      const swaps = [
        ['GDMR Connect HRMS', 'aieque'],
        ['GDMR CONNECT', 'AIEQUE'],
        ['GDMR Connect', 'aieque'],
        ['GDMR FOUNDATION', 'AIEQUE TRADEMARK SERVICES'],
        ['GDMR Foundation', 'aieque Trademark Services'],
        ['GDMR-001, GDMR-002', 'AIQ-001, AIQ-002'],
        ['alt="GDMR"', 'alt="aieque"'],
        ['GDMR Logo', 'aieque logo'],
        ["GDMR's AI assistant", "aieque's AI assistant"],
        ['application with GDMR.', 'application with aieque.'],
        ['₹', 'AED '],
      ]
      for (const [a, b] of swaps) out = out.split(a).join(b)
      // never let the demo fall back to the production backend
      out = out.split('https://gdmrconnect-backend-production.up.railway.app').join(DEMO_BASE)
      out = out.split('https://api.gdmrconnect.com').join(DEMO_BASE)
      return out === code ? null : { code: out, map: null }
    },
    transformIndexHtml(html) {
      return html
        .replace('GDMR - ERP', 'aieque')
        .replace('GDMR Connect', 'aieque')
        .replace('/src/assets/GDMR-LOGO-unit.png', '/src/assets/brands/aieque-logo.png')
    },
  }
}

export default defineConfig({
  plugins: [react(), ...(DEMO ? [aiequeBrand()] : [])],
  resolve: {
    alias: DEMO
      ? [{ find: /^.*\/assets\/GDMR-LOGO-unit\.png$/, replacement: path.resolve(process.cwd(), 'src/assets/brands/aieque-logo.png') }]
      : [],
  },
  define: {
    // Production: force the API through Cloudflare — overrides any Vercel dashboard env var.
    // Demo build: use the demo backend given in VITE_API_URL.
    'import.meta.env.VITE_API_URL': JSON.stringify(DEMO ? DEMO_API : 'https://api.gdmrconnect.com/api'),
    'import.meta.env.VITE_BRAND': JSON.stringify(DEMO ? 'aieque' : ''),
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
