import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import {
  type LogicalMediaDeviceMode,
  type LogicalMediaDevicePttScope,
  useDevicesStore,
} from '@/shared/composables'
import { applyGooseMicrophoneDefaultsForCurrentMode } from '@/shared/controller'
import { useLocalization } from '@/shared/i18n'

export const useGooseMediaSettings = () => {
  const devicesStore = useDevicesStore()
  const pinnedCallsPanelStore = usePinnedCallsPanelStore()
  const {
    gooseDevices,
    gooseMode,
    goosePttScope,
    preferredGooseId,
  } = storeToRefs(devicesStore)
  const {
    setGooseMode,
    setGoosePttScope,
    setPreferredGooseId,
  } = devicesStore
  const { t } = useLocalization()

  const hasGooseDevices = computed(() => gooseDevices.value.length > 0)

  const gooseSelectItems = computed(() =>
    gooseDevices.value.map(device => ({
      value: device.id,
      label: device.name,
    })),
  )

  const gooseModeSelectItems = computed(() => [
    { value: 'stateful' as const, label: t('StatefulMode') },
    { value: 'pushToTalk' as const, label: t('PushToTalk') },
  ])

  const goosePttScopeSelectItems = computed(() => [
    { value: 'standard' as const, label: t('PushToTalkScopeStandard') },
    { value: 'activePinned' as const, label: t('PushToTalkScopeActivePinned') },
  ])

  const preferredGooseModel = computed({
    get: () => preferredGooseId.value ?? gooseDevices.value[0]?.id ?? '',
    set: (id: string) => {
      setPreferredGooseId(id || undefined)
      pinnedCallsPanelStore.rebindPanelSessionsToPreferredGoose()
      applyGooseMicrophoneDefaultsForCurrentMode()
    },
  })

  const gooseModeModel = computed({
    get: () => gooseMode.value,
    set: (mode: LogicalMediaDeviceMode) => {
      setGooseMode(mode)
      applyGooseMicrophoneDefaultsForCurrentMode()
    },
  })

  const goosePttScopeModel = computed({
    get: () => goosePttScope.value,
    set: (scope: LogicalMediaDevicePttScope) => {
      setGoosePttScope(scope)
      applyGooseMicrophoneDefaultsForCurrentMode()
    },
  })

  const isPushToTalkMode = computed(() => gooseMode.value === 'pushToTalk')

  return {
    gooseModeModel,
    gooseModeSelectItems,
    goosePttScopeModel,
    goosePttScopeSelectItems,
    gooseSelectItems,
    hasGooseDevices,
    isPushToTalkMode,
    preferredGooseModel,
  }
}
