export const isElectron = (): boolean => {
  if (import.meta.env.VITE_ELECTRON === 'true') {
    return true
  }

  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined'
}
