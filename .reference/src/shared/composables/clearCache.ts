export const clearCache = async () => {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName)),
      )
      return true
    } catch (error) {
      console.error('Failed to clear cache', error)
      return false
    }
  } else {
    console.warn('Cache API not supported')
    return false
  }
}