import axios from 'axios'

import { useAuth } from './use-auth'

export function setupAxiosInterceptor () {
  // Очередь запросов, заблокированных из-за обновления токена
  let isRefreshing = false
  let failedQueue: Array<{ resolve: (value?: unknown) => void, reject: (error?: unknown) => void, config: unknown }> = []

  // Обработка очереди
  const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error)
      } else {
        prom.resolve(token)
      }
    })
    failedQueue = []
  }

  // Интерцептор ответов
  axios.interceptors.response.use(
    // Успешный ответ — просто возвращаем
    (response) => response,
    // Ошибка — обрабатываем
    async (error) => {
      const originalRequest = error.config

      // Если это не 401 — пропускаем
      if (error.response?.status !== 401) {
        return Promise.reject(error)
      }

      // Защита от повторного refresh
      if (originalRequest._retry) {
        // Если запрос уже был повторён, но снова 401 — скорее всего, сессия недействительна
        await useAuth.logout()
        return Promise.reject(error)
      }

      // Помечаем запрос как "уже повторный"
      originalRequest._retry = true

      // Если refresh уже запущен — ставим запрос в очередь
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest })
        }).catch((err) => Promise.reject(err))
      }

      // Начинаем обновление токена
      isRefreshing = true

      try {
        const success = await useAuth.refreshToken()

        if (success) {
          const newToken = useAuth.getAccessToken()
          if (newToken) {
            // Обновляем глобальный заголовок
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
            // Обновляем заголовок в оригинальном запросе
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`
          }

          // Запускаем очередь с новым токеном
          processQueue(null, newToken)

          // Повторяем оригинальный запрос
          return axios(originalRequest)
        } else {
          // refresh не удался — выходим
          await useAuth.logout()
          processQueue(new Error('Session refresh failed'), null)
          return Promise.reject(new Error('Session expired'))
        }
      } catch (refreshError) {
        // Ошибка при refresh
        await useAuth.logout()
        processQueue(refreshError, null)
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    },
  )
}
