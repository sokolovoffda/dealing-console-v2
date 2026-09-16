import { UserInfo } from '@wui/common-library'

import { getAppURL } from '@/shared/url-helper'
import { isElectron } from '@/shared/utils/electron-helpers'

const getLoginPath = (): string => getAppURL({ pathName: '/api/user/login' })
const getLogoutPath = (): string => getAppURL({ pathName: '/api/user/logout' })
const getChangePasswordPath = (): string => getAppURL({ pathName: '/api/user/change-password' })
const getRefreshTokenPath = (): string => getAppURL({ pathName: '/api/user/refresh-token' })

// === Типы ===
interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    userInfo: UserInfo;
}

interface RefreshTokenResponse {
    accessToken: string;
    refreshToken: string;
}

interface AuthEventMap {
    login: UserInfo;
    restore: UserInfo;
    logout: void;
    token_refreshed: string; // новый access token
    error: Error;
}

// === Менеджер событий ===
class AuthEventTarget {
  private emitter = new EventTarget()

  addListener<T extends keyof AuthEventMap> (event: T, listener: (data: AuthEventMap[T]) => void): () => void {
    const wrapper = (e: Event) => listener((e as CustomEvent).detail)
    this.emitter.addEventListener(`auth:${event}`, wrapper)
    return () => this.emitter.removeEventListener(`auth:${event}`, wrapper)
  }

  dispatch<T extends keyof AuthEventMap> (event: T, detail: AuthEventMap[T]): void {
    this.emitter.dispatchEvent(new CustomEvent(`auth:${event}`, { detail }))
  }
}

// === Основной класс аутентификации ===
class AuthManager {
  private user: UserInfo | null = null
  private tokens: AuthTokens | null = null
  private isLoading = false
  private eventTarget = new AuthEventTarget()
  private isInitialized = false

  constructor () {}
  // === Вызывать только после подписок на события !!! ===
  init () {
    if (this.isInitialized) return
    this.isInitialized = true
    this.restoreSession()
      
    if (isElectron()) {
      this.setupElectronListeners()
    }  
  }
  private setupElectronListeners (): void {
    if (!isElectron() || !window.electronAPI) return

    // Слушаем сетевые ошибки из Electron
    window.electronAPI.onNetworkError((event, errorData) => {
      const networkError = errorData as { description?: string }
      console.error('Electron network error:', errorData)

      const error = new Error(`Network error: ${networkError.description || 'Connection failed'}`)
      this.eventTarget.dispatch('error', error)
    })

    // Слушаем ошибки сертификатов
    window.electronAPI.onCertificateError((event, certificateError) => {
      const certificateIssue = certificateError as { url?: string }
      console.error('Electron certificate error:', certificateError)

      const error = new Error(`Security error: Invalid certificate for ${certificateIssue.url ?? 'unknown url'}`)
      this.eventTarget.dispatch('error', error)
    })
  }
  // === Восстановление сессии из localStorage ===
  private restoreSession (): void {
    try {
      const storedUser = localStorage.getItem('auth_user')
      const accessToken = localStorage.getItem('access_token')
      const refreshToken = localStorage.getItem('refresh_token')
      if (storedUser && accessToken && refreshToken) {
        const parsedUser = JSON.parse(storedUser) as UserInfo
        if (parsedUser) {
          this.user = parsedUser
          this.tokens = { accessToken, refreshToken }
          this.eventTarget.dispatch('restore', parsedUser)
        } else {
          this.clearSession()
        }
      }
    } catch (error: unknown) {
      console.error(error)
      this.clearSession()
    }
  }
  // === Сохранение сессии ===
  private saveSession (tokens: AuthTokens, user: UserInfo): void {
    this.tokens = tokens
    this.user = user

    localStorage.setItem('access_token', tokens.accessToken)
    localStorage.setItem('refresh_token', tokens.refreshToken)
    localStorage.setItem('auth_user', JSON.stringify(user))

    this.eventTarget.dispatch('login', user)
  }
  // === Очистка сессии ===
  private clearSession (): void {
    this.tokens = null
    this.user = null

    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth_user')

    this.eventTarget.dispatch('logout', undefined)
  }
  // === Получить текущий access token ===
  getAccessToken (): string | null {
    return this.tokens?.accessToken || null
  }
  // === Проверка аутентификации ===
  isAuthenticated (): boolean {
    return !!this.tokens && !!this.user
  }
  // === Логин ===
  async login (login: string, password: string, domain: string): Promise<void> {
    if (this.isLoading) throw new Error('Authentication in progress')

    this.isLoading = true
    try {
      const response = await fetch(getLoginPath(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ login, password, domain }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        console.log('error', error)
        throw new Error(error.message ?? 'Login failed')
      }

      const data: LoginResponse = await response.json()
      this.saveSession({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.userInfo)
    } catch (error) {
      this.eventTarget.dispatch('error', error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      this.isLoading = false
    }
  }
  // === Обновление токена ===
  async refreshToken (): Promise<boolean> {
    const refreshToken = this.tokens?.refreshToken
    const accessToken = this.tokens?.accessToken  
    if (!this.tokens || !refreshToken || !accessToken) return false
    
    try {
      const response = await fetch(getRefreshTokenPath(), {
        method: 'POST',
        headers: {
          Accept: 'application/json, text/plain',
          'Content-Type': 'application/json;charset=UTF-8',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      })
        
      if (response.ok) {
        const data: RefreshTokenResponse = await response.json()
        const newAccessToken: string = data.accessToken
        const newRefreshToken: string = data.refreshToken

        // Обновляем токены
        this.tokens.accessToken = newAccessToken
        this.tokens.refreshToken = newRefreshToken

        localStorage.setItem('access_token', newAccessToken)
        localStorage.setItem('refresh_token', newRefreshToken)

        this.eventTarget.dispatch('token_refreshed', newAccessToken)
        return true
      } else {
        this.clearSession()
        return false
      }
    } catch (error: unknown) {
      console.error(error)
      this.clearSession()
      return false
    }
  }
  // === Смена пароля ===
  async changePassword (payload: { login: string, password: string, domain: string }): Promise<void> {
    const token = this.getAccessToken()
    if (!token) throw new Error('Not authenticated')

    const response = await fetch(getChangePasswordPath(), {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
      },
    })

    if (response.status === 401) {
      const refreshed = await this.refreshToken()
      if (!refreshed) throw new Error('Session expired')

      // Повтор после обновления токена
      const newToken = this.getAccessToken()
      const retryResponse = await fetch(getChangePasswordPath(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({}))
        throw new Error(error.message || 'Change password failed')
      }
    } else if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Change password failed')
    }
  }
  // === Выход ===
  async logout (): Promise<void> {
    const token = this.getAccessToken()
    const refreshToken = this.tokens?.refreshToken

    try {
      if (token && refreshToken) {
        const response = await fetch(getLogoutPath(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken }),
        })

        if (!response.ok) {
          console.warn(`Logout request failed with status ${response.status}`)
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      this.clearSession()
    }
  }
  // === Подписка на события ===
  on<T extends keyof AuthEventMap> (event: T, listener: (data: AuthEventMap[T]) => void): () => void {
    return this.eventTarget.addListener(event, listener)
  }
}

// === Единый экземпляр useAuth ===
export const useAuth = new AuthManager()
