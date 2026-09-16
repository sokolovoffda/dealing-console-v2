export const debounce = <T extends (...args: unknown[]) => void>(cb: T, delayMs: number) => {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      cb(...args)
      timeout = null
    }, delayMs)
  }
}