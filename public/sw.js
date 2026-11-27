// Minimal service worker: it makes ClassPilotHub installable and shows a friendly page when the phone is offline.
// It deliberately caches nothing, so logins, fees and attendance are never stale.
const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ClassPilotHub is offline</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f3e8;color:#1f2a22;text-align:center;padding:24px}button{margin-top:16px;padding:10px 18px;border-radius:999px;border:0;background:#1f2a22;color:#f6f3e8;font-size:15px}</style></head><body><div><h1>You&rsquo;re offline</h1><p>ClassPilotHub needs an internet connection. Check your connection and try again.</p><button onclick="location.reload()">Try again</button></div></body></html>`

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })),
  )
})
