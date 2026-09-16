export const throttle = <TArgs extends unknown[], TReturn extends void | Promise<void>>(
  cb: (...args: TArgs) => TReturn,
  delayMs: number,
) => {
  let timeout: NodeJS.Timeout | null = null

  return (...args: TArgs): void => {
    if (timeout) return

    timeout = setTimeout(() => {
      cb(...args)
      timeout = null
    }, delayMs)
  }
}