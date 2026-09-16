import { storeToRefs } from 'pinia'
import { watch } from 'vue'

import { useMainSettingsStore } from '@/entities/main-settings'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import { useGlobalRingtone } from './useGlobalRingtone'

export const useGlobalRingtoneSettingsSync = () => {
  const mainSettingsStore = useMainSettingsStore()
  const pinnedCallsPanelStore = usePinnedCallsPanelStore()
  const { settings } = storeToRefs(mainSettingsStore)
  const { globalVolumeMultiplier } = storeToRefs(pinnedCallsPanelStore)
  const { setVolume } = useGlobalRingtone()

  watch(
    [
      () => settings.value.incomingCallVolume,
      () => globalVolumeMultiplier.value,
    ],
    ([incomingCallVolume, mainSpeakerVolumeMultiplier]) => {
      setVolume(incomingCallVolume * mainSpeakerVolumeMultiplier)
    },
    { immediate: true },
  )
}