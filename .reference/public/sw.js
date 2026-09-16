import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { setCacheNameDetails } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { precacheAndRoute } from 'workbox-precaching'
import { RangeRequestsPlugin } from 'workbox-range-requests'
import { NavigationRoute, Route, registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst, NetworkOnly } from 'workbox-strategies'

self.__WB_DISABLE_DEV_LOGS = true

const SERVICE_WORKER_VERSION = 'v3'
const FALLBACK_CACHE_NAME = 'offline-fallback'
const FALLBACK_HTML = '/offline.html'

setCacheNameDetails({
  prefix: '',
  suffix: '',
  precache: 'dispatch-console' + '-' + SERVICE_WORKER_VERSION,
})

precacheAndRoute(self.__WB_MANIFEST.filter((file) => !file.url.includes('index.html') && !file.url.includes('version.json')))

// Cache the fallback HTML during installation.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(FALLBACK_CACHE_NAME).then((cache) => cache.add(FALLBACK_HTML)),
  )
})

const networkWithFallbackStrategy = new NetworkOnly({
  networkTimeoutSeconds: 5,
  plugins: [
    {
      handlerDidError: async () => {
        // Вернуть /offline.html при ошибке сети
        const cache = await caches.open(FALLBACK_CACHE_NAME)
        return await cache.match(FALLBACK_HTML)
      },
    },
  ],
})

// Handle images:
const imageRoute = new Route(({ request }) => {
  return request.destination === 'image'
}, new StaleWhileRevalidate({
  cacheName: 'images',
  plugins: [
    new ExpirationPlugin({
      maxAgeSeconds: 60 * 60 * 24 * 30,
    }),
  ],
}))

// Handle scripts:
const scriptsRoute = new Route(({ request }) => {
  return request.destination === 'script'
}, new CacheFirst({
  cacheName: 'scripts',
  plugins: [
    new ExpirationPlugin({
      maxEntries: 50,
    }),
  ],
}))

// Handle styles:
const stylesRoute = new Route(({ request }) => {
  return request.destination === 'style'
}, new CacheFirst({
  cacheName: 'styles',
}))

// Handle audio and video
const audioAndVideoRoute = new Route(({ request }) => {
  const { destination } = request
  return destination === 'video' || destination === 'audio'
},
new CacheFirst({
  cacheName: 'audio-and-video',
  plugins: [
    new CacheableResponsePlugin({
      statuses: [200],
    }),
    new RangeRequestsPlugin(),
  ],
}))

// **Offline HTML route with staleWhileRevalidate**
const offlineHtmlRoute = new Route(
  ({ request }) => request.mode === 'navigate' && request.destination === 'document',
  new StaleWhileRevalidate({
    cacheName: FALLBACK_CACHE_NAME,
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  }),
)

// Register routes
registerRoute(new NavigationRoute(networkWithFallbackStrategy))
registerRoute(imageRoute)
registerRoute(scriptsRoute)
registerRoute(stylesRoute)
registerRoute(audioAndVideoRoute)
registerRoute(offlineHtmlRoute)

self.addEventListener('message', async (event) => {
  const { type, accessToken, refreshToken } = event.data

  if (type === 'refresh-token') {
    self.clients.matchAll().then((clients) => {
      clients.filter(c => c.id != event.source.id).forEach((c) => {
        c.postMessage({ type, accessToken, refreshToken })
      })
    })
  }
})
