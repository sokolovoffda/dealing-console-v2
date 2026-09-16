import { isElectron, transformURLPathForElectron } from '@/shared/utils/electron-helpers'

/** Absolute `/ringtone.mp3` breaks in Electron (`file:///ringtone.mp3`). Same as global ringtone. */
const DEFAULT_OUTPUT_TEST_SRC = isElectron()
  ? transformURLPathForElectron(import.meta.url, 'ringtone.mp3')
  : '/ringtone.mp3'

type SinkCapableAudio = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>
}

type StartMediaDeviceOutputTestParams = {
  outputId: string
  /** 0–1 */
  volume: number
  src?: string
  onStop?: () => void
}

let activeAudio: SinkCapableAudio | null = null
let activeOnStop: (() => void) | null = null

export const stopMediaDeviceOutputTest = () => {
  const onStop = activeOnStop
  activeOnStop = null

  if (activeAudio) {
    activeAudio.pause()
    activeAudio.removeAttribute('src')
    activeAudio.load()
    activeAudio = null
  }

  onStop?.()
}

/**
 * Plays ringtone to a specific browser audiooutput via setSinkId.
 * Only one test at a time across Media Device cards.
 */
export const startMediaDeviceOutputTest = async ({
  outputId,
  volume,
  src = DEFAULT_OUTPUT_TEST_SRC,
  onStop,
}: StartMediaDeviceOutputTestParams): Promise<void> => {
  stopMediaDeviceOutputTest()

  const audio: SinkCapableAudio = new Audio(src)
  audio.loop = true
  audio.volume = Math.min(1, Math.max(0, volume))
  activeAudio = audio
  activeOnStop = onStop ?? null

  try {
    if (typeof audio.setSinkId === 'function') {
      await audio.setSinkId(outputId)
    } else {
      console.warn('HTMLMediaElement.setSinkId is not supported; playing on default output')
    }

    await audio.play()
  } catch (error) {
    stopMediaDeviceOutputTest()
    throw error
  }
}

export const setMediaDeviceOutputTestVolume = (volume: number) => {
  if (activeAudio) activeAudio.volume = Math.min(1, Math.max(0, volume))
}

export const isMediaDeviceOutputTestActive = (): boolean => Boolean(activeAudio)
