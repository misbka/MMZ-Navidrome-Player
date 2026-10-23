/* Service worker básico — cache CacheFirst para capas do Navidrome */
const CACHE_NAME = 'navidrome-covers-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE_NAME))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // apenas capas e ícones
  const isCover =
    url.pathname.includes('getCoverArt') || url.pathname.endsWith('.webp') || url.pathname.endsWith('.jpg')
  if (event.request.method !== 'GET' || !isCover) return

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request)
      if (cached) return cached
      try {
        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      } catch {
        return cached ?? Response.error()
      }
    }),
  )
})
