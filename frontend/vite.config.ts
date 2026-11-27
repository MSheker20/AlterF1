/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Not VITE_-prefixed on purpose: this is server-side config, not client env.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:8080'

// Link-preview crawlers do not run JavaScript (PLAN.md §2.4): their page requests go to the
// backend's /og/page/..., a small HTML page with Open Graph tags. Everyone else gets the SPA.
const PREVIEW_BOTS =
  /facebookexternalhit|facebot|twitterbot|whatsapp\/|slackbot|linkedinbot|discordbot|telegrambot|skypeuripreview|redditbot|applebot|pinterestbot|embedly|vkshare|googlebot|bingbot|mastodon\//i

// The SPA pages a preview can describe; anything else (assets, odd paths, "..") is served normally.
const PREVIEW_PAGE = /^(\/tr)?(\/|\/about\/?|\/season\/\d{4}(\/compare|\/progression)?\/?)?$/

function isPreviewRequest(req: { method?: string; url?: string; headers: Record<string, unknown> }) {
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : ''
  if ((req.method !== 'GET' && req.method !== 'HEAD') || !PREVIEW_BOTS.test(userAgent)) {
    return false
  }
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
  return PREVIEW_PAGE.test(pathname) && !(req.url ?? '').includes('..')
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      // xfwd passes the public host on, so the preview's image URL points back at this server.
      '/og': { target: apiTarget, changeOrigin: true, xfwd: true },
      // Page URLs, with or without a query string (shared links often carry ?fbclid=… or utm_*).
      '^(/tr)?(/(season/|about)|/?(\\?|$))': {
        target: apiTarget,
        changeOrigin: true,
        xfwd: true,
        bypass: (req) => (isPreviewRequest(req) ? undefined : req.url),
        rewrite: (path) => `/og/page${path}`,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Playwright specs in e2e/ run against the live stack, not in Vitest.
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
