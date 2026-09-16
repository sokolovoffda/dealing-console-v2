import { inject, InjectionKey } from 'vue'

export function safeInject<T> (key: string | InjectionKey<T>): T {
  const val = inject<T>(key)

  if (!val) {
    throw new Error(`cannot inject value by key ${key.toString()}`)
  }

  return val
}
