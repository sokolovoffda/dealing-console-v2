import { readonly, ref } from 'vue'

import { isElectron, transformURLPathForElectron } from '@/shared/utils/electron-helpers'

const DEFAULT_RINGTONE_PATH = isElectron()
  ? transformURLPathForElectron(import.meta.url, 'ringtone.mp3')
  : '/ringtone.mp3'

const ringtonePlayer = new Audio(DEFAULT_RINGTONE_PATH)
ringtonePlayer.loop = true
ringtonePlayer.volume = 1

const isPlayed = ref(false)

ringtonePlayer.addEventListener('pause', () => {
  const { setRingtoneState } = useGlobalRingtone()
  setRingtoneState(false)
})

ringtonePlayer.addEventListener('play', () => {
  const { setRingtoneState } = useGlobalRingtone()
  setRingtoneState(true)
})

export const useGlobalRingtone = () => {
  const setRingtoneState = (value: boolean) => {
    console.debug('ringtone state: ', value)
    isPlayed.value = value
  }

  const setVolume = (value: number) => {
    const normalizedValue = Math.min(Math.max(value, 0), 100) / 100
    ringtonePlayer.volume = normalizedValue
  }

  const toggleRingtone = async () => {
    try {
      if (ringtonePlayer.paused) {
        await ringtonePlayer.play()
      } else {
        ringtonePlayer.pause()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const play = async () => {
    try {
      if (!ringtonePlayer.src) {
        console.warn('Не задан источник аудио')
        return
      }

      if (!ringtonePlayer.paused) {
        console.debug('Аудио уже воспроизводится')
        return
      }

      await ringtonePlayer.play()
      console.debug('Рингтон воспроизводится')
    } catch (e) {
      console.error('Ошибка воспроизведения рингтона:', e)
    }
  }

  const pause = () => {
    try {
      if (ringtonePlayer.paused) {
        console.debug('Аудио уже на паузе')
        return
      }

      ringtonePlayer.pause()
      console.debug('Рингтон на паузе')
    } catch (e) {
      console.error('Ошибка при остановке рингтона:', e)
    }
  }

  const changePathInPlayer = (path?: string) => {
    ringtonePlayer.src = path || DEFAULT_RINGTONE_PATH
  }

  return {
    isPlayed: readonly(isPlayed),
    ringtonePlayer,
    setRingtoneState,
    setVolume,
    toggleRingtone,
    changePathInPlayer,
    playRingtone: play,
    pauseRingtone: pause,
  }
}