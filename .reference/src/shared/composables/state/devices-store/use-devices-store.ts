import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  filterAvailableAudioMediaDevices,
  isAudioInputMediaDevice,
  isAudioOutputMediaDevice,
  isDefaultMediaDevice,
  isEchoCancelledMediaDevice,
} from './media-device-filter'
import { isUsableForMediaDevice } from './media-device-usability'
import {
  LogicalMediaDeviceIconEnum,
  LogicalMediaDeviceTypeEnum,
  type AudioMediaDevice,
  type ControllerMediaModule,
  type LogicalMediaDevice,
  type LogicalMediaDeviceMode,
  type LogicalMediaDevicePttScope,
  type LogicalMediaDeviceStatus,
  type LogicalMediaDeviceType,
  type LogicalMediaDeviceUserMediaOverride,
} from './types'

const CONTROLLER_GOOSE_TYPE = 1
const CONTROLLER_HANDSET_TYPE = 2

const DEFAULT_GOOSE_MODE: LogicalMediaDeviceMode = 'stateful'
const DEFAULT_GOOSE_PTT_SCOPE: LogicalMediaDevicePttScope = 'standard'

type ControllerLogicalMediaDeviceType =
  | typeof LogicalMediaDeviceTypeEnum.GOOSE
  | typeof LogicalMediaDeviceTypeEnum.HANDSET
  | typeof LogicalMediaDeviceTypeEnum.MAIN

const getBrowserMediaDevices = (): MediaDevices | null => {
  if (typeof navigator === 'undefined') return null

  return navigator.mediaDevices ?? null
}

const normalizeLabel = (label: string): string => label.trim().toLowerCase()
const MAIN_OUTPUT_LABEL = 'main'
/** Display name until Media Devices i18n step for Main card title. */
const MAIN_DEVICE_NAME = 'Основной динамик'

const getModuleAudioLabels = (
  module: ControllerMediaModule,
  key: 'sources' | 'sinks',
): string[] => [
  ...(module[key] ?? []),
  ...(module.audiolabel ? [module.audiolabel] : []),
]

const resolveControllerModuleType = (
  module: ControllerMediaModule,
): ControllerLogicalMediaDeviceType | null => {
  const moduleName = module.name?.toLowerCase()
  const moduleId = module.id?.toLowerCase()

  if (
    module.type === CONTROLLER_GOOSE_TYPE ||
    moduleName === 'goose' ||
    moduleId?.startsWith('goose_')
  ) {
    return LogicalMediaDeviceTypeEnum.GOOSE
  }

  if (
    module.type === CONTROLLER_HANDSET_TYPE ||
    moduleName === 'handset' ||
    moduleId?.startsWith('handset_')
  ) {
    return LogicalMediaDeviceTypeEnum.HANDSET
  }

  if (moduleId === 'hub' || moduleName === 'hub') {
    return LogicalMediaDeviceTypeEnum.MAIN
  }

  return null
}

const findAudioDeviceByLabels = (
  devices: readonly AudioMediaDevice[],
  labels: readonly string[],
  kind: AudioMediaDevice['kind'],
) => {
  const normalizedLabels = labels.map(normalizeLabel)

  return devices.find((device) => {
    const deviceLabel = normalizeLabel(device.label)

    return device.kind === kind && normalizedLabels.some(label =>
      deviceLabel === label || deviceLabel.endsWith(` ${label}`),
    )
  })
}

const takeNextUnusedAudioDevice = (
  devices: readonly AudioMediaDevice[],
  kind: AudioMediaDevice['kind'],
  usedAudioDeviceIds: Set<string>,
) => {
  const device = devices.find(item =>
    item.kind === kind && !usedAudioDeviceIds.has(item.deviceId),
  )

  if (device) usedAudioDeviceIds.add(device.deviceId)

  return device
}

const resolvePreferredPinnedOutputId = (
  devices: readonly MediaDeviceInfo[],
  currentPreferredOutputId?: string,
): string | undefined => {
  const outputs = devices.filter(device =>
    isAudioOutputMediaDevice(device) && !isEchoCancelledMediaDevice(device),
  )

  if (!outputs.length) return undefined

  if (currentPreferredOutputId && outputs.some(device => device.deviceId === currentPreferredOutputId)) {
    return currentPreferredOutputId
  }

  const mainOutput = outputs.find(device => normalizeLabel(device.label) === MAIN_OUTPUT_LABEL)
  if (mainOutput) return mainOutput.deviceId

  const namedOutput = outputs.find(device => !isDefaultMediaDevice(device))
  if (namedOutput) return namedOutput.deviceId

  return outputs[0]?.deviceId
}

const getDeviceStatus = (config: {
  hasInput: boolean
  hasOutput: boolean
  inputId?: string
  outputId?: string
}): LogicalMediaDeviceStatus => {
  const requiredStates = [
    config.hasInput ? Boolean(config.inputId) : null,
    config.hasOutput ? Boolean(config.outputId) : null,
  ].filter((state): state is boolean => state !== null)

  if (!requiredStates.length) return 'ready'
  if (requiredStates.every(Boolean)) return 'ready'
  if (requiredStates.some(Boolean)) return 'partial'

  return 'missing'
}

const getControllerDeviceName = (
  type: LogicalMediaDeviceType,
  order: number,
): string => {
  if (type === LogicalMediaDeviceTypeEnum.MAIN) return MAIN_DEVICE_NAME
  if (type === LogicalMediaDeviceTypeEnum.GOOSE) return `Goose ${order}`
  if (type === LogicalMediaDeviceTypeEnum.HANDSET) return `Handset ${order}`

  return `Device ${order}`
}

const getControllerDeviceIcon = (type: LogicalMediaDeviceType) => {
  if (type === LogicalMediaDeviceTypeEnum.GOOSE) return LogicalMediaDeviceIconEnum.MIC_SPEAKER
  if (type === LogicalMediaDeviceTypeEnum.MAIN) return LogicalMediaDeviceIconEnum.SPEAKER

  return LogicalMediaDeviceIconEnum.PHONE
}

const createControllerLogicalDevice = (config: {
  module: ControllerMediaModule
  type: LogicalMediaDeviceType
  order: number
  iconNumber: string
  inputDevice?: AudioMediaDevice
  outputDevice?: AudioMediaDevice
}): LogicalMediaDevice => {
  const isMain = config.type === LogicalMediaDeviceTypeEnum.MAIN
  // Main speaker card: output-only in Settings (hub may report audio_in — ignore for UI model).
  const hasInput = isMain
    ? false
    : (config.module.features?.audio_in ?? Boolean(config.module.sources?.length))
  const hasOutput = isMain
    ? true
    : (config.module.features?.audio_out ?? Boolean(config.module.sinks?.length))
  const inputId = config.inputDevice?.deviceId
  const outputId = config.outputDevice?.deviceId

  return {
    id: config.module.id ?? `${config.type}_${config.module.position}`,
    name: getControllerDeviceName(config.type, Number(config.iconNumber)),
    type: config.type,
    order: config.order,
    icon: getControllerDeviceIcon(config.type),
    iconNumber: config.iconNumber,
    inputId,
    outputId,
    inputLabel: config.inputDevice?.label,
    outputLabel: config.outputDevice?.label,
    module: config.module.id,
    controllerDeviceId: config.module.id,
    origin: 'controller',
    hasInput,
    hasOutput,
    status: getDeviceStatus({ hasInput, hasOutput, inputId, outputId }),
    mode: config.type === LogicalMediaDeviceTypeEnum.GOOSE ? 'stateful' : undefined,
    pttScope: config.type === LogicalMediaDeviceTypeEnum.GOOSE ? 'standard' : undefined,
    enabled: true,
    volume: 50,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
}

const createBrowserLogicalDevice = (
  device: AudioMediaDevice,
  order: number,
): LogicalMediaDevice => {
  const isInput = device.kind === 'audioinput'

  return {
    id: `${device.kind}:${device.deviceId}`,
    name: device.label || `Audio ${order}`,
    type: isInput
      ? LogicalMediaDeviceTypeEnum.INPUT
      : LogicalMediaDeviceTypeEnum.OUTPUT,
    order,
    icon: isInput
      ? LogicalMediaDeviceIconEnum.MIC
      : LogicalMediaDeviceIconEnum.HEADPHONES,
    iconNumber: '',
    inputId: isInput ? device.deviceId : undefined,
    outputId: isInput ? undefined : device.deviceId,
    inputLabel: isInput ? device.label : undefined,
    outputLabel: isInput ? undefined : device.label,
    origin: 'browser',
    hasInput: isInput,
    hasOutput: !isInput,
    status: 'ready',
    enabled: true,
    volume: 50,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
}

const buildLogicalDevices = (
  audioDevices: readonly AudioMediaDevice[],
  controllerModules: readonly ControllerMediaModule[],
): LogicalMediaDevice[] => {
  const usedAudioDeviceIds = new Set<string>()
  const devices: LogicalMediaDevice[] = []
  const mainDevices: LogicalMediaDevice[] = []
  const iconCounters = {
    [LogicalMediaDeviceTypeEnum.GOOSE]: 0,
    [LogicalMediaDeviceTypeEnum.HANDSET]: 0,
  }

  const markMainBrowserEndpointsUsed = () => {
    audioDevices.forEach((device) => {
      if (normalizeLabel(device.label) === MAIN_OUTPUT_LABEL) {
        usedAudioDeviceIds.add(device.deviceId)
      }
    })
  }

  controllerModules.forEach((module) => {
    if (!module.available) return

    const type = resolveControllerModuleType(module)
    if (!type) return

    if (type === LogicalMediaDeviceTypeEnum.MAIN) {
      const mainLabels = [
        module.audiolabel,
        MAIN_OUTPUT_LABEL,
      ].filter((label): label is string => Boolean(label))

      const matchedOutput = findAudioDeviceByLabels(
        audioDevices,
        mainLabels,
        'audiooutput',
      ) ?? findAudioDeviceByLabels(
        audioDevices,
        getModuleAudioLabels(module, 'sinks'),
        'audiooutput',
      )

      if (matchedOutput) usedAudioDeviceIds.add(matchedOutput.deviceId)
      markMainBrowserEndpointsUsed()

      // Main всегда в конце списка — order проставим после остальных.
      mainDevices.push(createControllerLogicalDevice({
        iconNumber: '',
        module,
        order: 0,
        outputDevice: matchedOutput,
        type,
      }))
      return
    }

    iconCounters[type] += 1

    const matchedInput = findAudioDeviceByLabels(
      audioDevices,
      getModuleAudioLabels(module, 'sources'),
      'audioinput',
    )
    const matchedOutput = findAudioDeviceByLabels(
      audioDevices,
      getModuleAudioLabels(module, 'sinks'),
      'audiooutput',
    )

    // Без совпадения labels (стенд/ПК без Module_*) — раздаём оставшиеся
    // browser devices по порядку: handset = in+out, goose = только in.
    const inputDevice = matchedInput ?? (
      type === LogicalMediaDeviceTypeEnum.HANDSET ||
      type === LogicalMediaDeviceTypeEnum.GOOSE
        ? takeNextUnusedAudioDevice(audioDevices, 'audioinput', usedAudioDeviceIds)
        : undefined
    )
    const outputDevice = matchedOutput ?? (
      type === LogicalMediaDeviceTypeEnum.HANDSET
        ? takeNextUnusedAudioDevice(audioDevices, 'audiooutput', usedAudioDeviceIds)
        : undefined
    )

    if (matchedInput) usedAudioDeviceIds.add(matchedInput.deviceId)
    if (matchedOutput) usedAudioDeviceIds.add(matchedOutput.deviceId)

    devices.push(createControllerLogicalDevice({
      iconNumber: String(iconCounters[type]),
      inputDevice,
      module,
      order: devices.length + 1,
      outputDevice,
      type,
    }))
  })

  audioDevices.forEach((audioDevice) => {
    if (usedAudioDeviceIds.has(audioDevice.deviceId)) return

    devices.push(createBrowserLogicalDevice(audioDevice, devices.length + 1))
  })

  mainDevices.forEach((device) => {
    devices.push({
      ...device,
      order: devices.length + 1,
    })
  })

  return devices
}

export const useDevicesStore = defineStore('devices-store', () => {
  const rawMediaDevices = ref<MediaDeviceInfo[]>([])
  const audioDevices = ref<AudioMediaDevice[]>([])
  const controllerModules = ref<ControllerMediaModule[]>([])
  const devices = ref<LogicalMediaDevice[]>([])
  const preferredPinnedOutputId = ref<string>()
  const preferredGooseId = ref<string | undefined>()
  const gooseMode = ref<LogicalMediaDeviceMode>(DEFAULT_GOOSE_MODE)
  const goosePttScope = ref<LogicalMediaDevicePttScope>(DEFAULT_GOOSE_PTT_SCOPE)
  const isMockControllerModules = ref(false)
  const audioEndpointOverrides = ref<Record<string, { inputId?: string, outputId?: string }>>({})
  /** Survives rebuildDevices; applied after endpoint overrides. */
  const userMediaOverrides = ref<Record<string, LogicalMediaDeviceUserMediaOverride>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)

  const audioInputs = computed(() =>
    audioDevices.value.filter(isAudioInputMediaDevice),
  )

  const audioOutputs = computed(() =>
    audioDevices.value.filter(isAudioOutputMediaDevice),
  )

  const gooseDevices = computed(() =>
    devices.value.filter(device => device.type === LogicalMediaDeviceTypeEnum.GOOSE),
  )

  const handsetDevices = computed(() =>
    devices.value.filter(
      device => device.type === LogicalMediaDeviceTypeEnum.HANDSET,
    ),
  )

  const queueDevices = computed(() =>
    devices.value.filter(
      device => device.type !== LogicalMediaDeviceTypeEnum.GOOSE && device.hasInput,
    ),
  )

  const readyDevices = computed(() =>
    devices.value.filter(isUsableForMediaDevice),
  )

  const readyGooseDevices = computed(() =>
    gooseDevices.value.filter(isUsableForMediaDevice),
  )

  const readyHandsetDevices = computed(() =>
    handsetDevices.value.filter(isUsableForMediaDevice),
  )

  const readyQueueDevices = computed(() =>
    queueDevices.value.filter(isUsableForMediaDevice),
  )

  const preferredGoose = computed(() => {
    if (preferredGooseId.value) {
      const selected = gooseDevices.value.find(device => device.id === preferredGooseId.value)
      if (selected) return selected
    }

    return gooseDevices.value.at(0)
  })

  const readyPreferredGoose = computed(() => {
    const preferred = preferredGoose.value
    if (isUsableForMediaDevice(preferred)) return preferred

    return readyGooseDevices.value.at(0)
  })

  const applyGooseMicSettings = (items: readonly LogicalMediaDevice[]): LogicalMediaDevice[] => {
    return items.map((device) => {
      if (device.type !== LogicalMediaDeviceTypeEnum.GOOSE) return device

      return {
        ...device,
        mode: gooseMode.value,
        pttScope: goosePttScope.value,
      }
    })
  }

  const syncPreferredGooseId = () => {
    const geese = gooseDevices.value
    if (!geese.length) return

    const hasPreferred = preferredGooseId.value
      && geese.some(device => device.id === preferredGooseId.value)

    if (hasPreferred) return

    preferredGooseId.value = geese[0]?.id
  }

  const rebuildDevices = () => {
    setDevices(applyGooseMicSettings(
      applyUserMediaOverrides(
        applyAudioEndpointOverrides(
          buildLogicalDevices(audioDevices.value, controllerModules.value),
        ),
      ),
    ))
    syncPreferredGooseId()
  }

  const applyUserMediaOverrides = (
    items: readonly LogicalMediaDevice[],
  ): LogicalMediaDevice[] => {
    return items.map((device) => {
      const override = userMediaOverrides.value[device.id]
      if (!override) return device

      return {
        ...device,
        enabled: override.enabled,
        volume: override.volume,
        echoCancellation: override.echoCancellation,
        noiseSuppression: override.noiseSuppression,
        autoGainControl: override.autoGainControl,
      }
    })
  }

  const setUserMediaOverride = (
    deviceId: string,
    fields: LogicalMediaDeviceUserMediaOverride,
  ) => {
    userMediaOverrides.value = {
      ...userMediaOverrides.value,
      [deviceId]: { ...fields },
    }

    const device = getDeviceById(deviceId)
    if (!device) return

    setDevice({
      ...device,
      ...fields,
    })
  }

  const replaceUserMediaOverrides = (
    next: Record<string, LogicalMediaDeviceUserMediaOverride>,
  ) => {
    userMediaOverrides.value = { ...next }
    rebuildDevices()
  }

  const clearUserMediaOverrides = () => {
    if (!Object.keys(userMediaOverrides.value).length) return
    userMediaOverrides.value = {}
    rebuildDevices()
  }

  const applyAudioEndpointOverrides = (
    items: readonly LogicalMediaDevice[],
  ): LogicalMediaDevice[] => {
    if (!isMockControllerModules.value) return [...items]

    return items.map((device) => {
      const override = audioEndpointOverrides.value[device.id]
      if (!override) return device

      const inputId = override.inputId ?? device.inputId
      const outputId = override.outputId ?? device.outputId
      const inputDevice = inputId
        ? audioDevices.value.find(item =>
          item.deviceId === inputId && item.kind === 'audioinput',
        )
        : undefined
      const outputDevice = outputId
        ? audioDevices.value.find(item =>
          item.deviceId === outputId && item.kind === 'audiooutput',
        )
        : undefined

      return {
        ...device,
        inputId,
        outputId,
        inputLabel: inputDevice?.label ?? device.inputLabel,
        outputLabel: outputDevice?.label ?? device.outputLabel,
        status: getDeviceStatus({
          hasInput: device.hasInput,
          hasOutput: device.hasOutput,
          inputId,
          outputId,
        }),
      }
    })
  }

  const setPreferredGooseId = (id: string | undefined) => {
    preferredGooseId.value = id
    syncPreferredGooseId()
  }

  const setGooseMode = (mode: LogicalMediaDeviceMode) => {
    gooseMode.value = mode
    rebuildDevices()
  }

  const setGoosePttScope = (scope: LogicalMediaDevicePttScope) => {
    goosePttScope.value = scope
    rebuildDevices()
  }

  const setMediaDevices = (devices: readonly MediaDeviceInfo[]) => {
    rawMediaDevices.value = [...devices]
    audioDevices.value = filterAvailableAudioMediaDevices(devices)
    preferredPinnedOutputId.value = resolvePreferredPinnedOutputId(
      rawMediaDevices.value,
      preferredPinnedOutputId.value,
    )
    rebuildDevices()
    error.value = null
  }

  const setControllerModules = (
    modules: readonly ControllerMediaModule[],
    options?: { mock?: boolean },
  ) => {
    const isMock = Boolean(options?.mock)
    controllerModules.value = [...modules]
    isMockControllerModules.value = isMock
    if (!isMock) {
      audioEndpointOverrides.value = {}
    }
    rebuildDevices()
  }

  const setDeviceAudioEndpoint = (
    deviceId: string,
    endpoint: 'input' | 'output',
    audioDeviceId: string,
  ) => {
    if (!isMockControllerModules.value) return

    const previous = audioEndpointOverrides.value[deviceId] ?? {}
    audioEndpointOverrides.value = {
      ...audioEndpointOverrides.value,
      [deviceId]: {
        ...previous,
        ...(endpoint === 'input'
          ? { inputId: audioDeviceId }
          : { outputId: audioDeviceId }),
      },
    }
    rebuildDevices()
  }

  const setDevices = (items: readonly LogicalMediaDevice[]) => {
    devices.value = [...items].sort((a, b) => a.order - b.order)
  }

  const setDevice = (item: LogicalMediaDevice) => {
    const index = devices.value.findIndex(device => device.id === item.id)

    if (index === -1) {
      setDevices([...devices.value, item])

      return
    }

    const nextDevices = [...devices.value]
    nextDevices[index] = item
    setDevices(nextDevices)
  }

  const loadMediaDevices = async () => {
    const browserMediaDevices = getBrowserMediaDevices()

    if (!browserMediaDevices?.enumerateDevices) {
      error.value = 'MediaDevices API is unavailable'

      return
    }

    isLoading.value = true
    error.value = null

    try {
      const devices = await browserMediaDevices.enumerateDevices()

      setMediaDevices(devices)
    } catch (loadError) {
      error.value =
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load media devices'
    } finally {
      isLoading.value = false
    }
  }

  const getAudioDeviceById = (
    deviceId: string,
    kind?: AudioMediaDevice['kind'],
  ) =>
    audioDevices.value.find(
      device => device.deviceId === deviceId && (!kind || device.kind === kind),
    )

  const getDeviceById = (id: string) =>
    devices.value.find(device => device.id === id)

  const getDeviceByModule = (module: string) =>
    devices.value.find(device => device.module === module)

  const handleDeviceChange = () => {
    void loadMediaDevices()
  }

  const init = async () => {
    if (isInitialized.value) return

    isInitialized.value = true
    await loadMediaDevices()

    getBrowserMediaDevices()?.addEventListener?.(
      'devicechange',
      handleDeviceChange,
    )
  }

  const dispose = () => {
    if (!isInitialized.value) return

    getBrowserMediaDevices()?.removeEventListener?.(
      'devicechange',
      handleDeviceChange,
    )
    isInitialized.value = false
  }

  return {
    audioDevices,
    audioInputs,
    audioOutputs,
    controllerModules,
    devices,
    dispose,
    error,
    getAudioDeviceById,
    getDeviceById,
    getDeviceByModule,
    gooseDevices,
    gooseMode,
    goosePttScope,
    handsetDevices,
    init,
    isInitialized,
    isLoading,
    isMockControllerModules,
    loadMediaDevices,
    preferredGoose,
    preferredGooseId,
    preferredPinnedOutputId,
    queueDevices,
    readyDevices,
    readyGooseDevices,
    readyHandsetDevices,
    readyPreferredGoose,
    readyQueueDevices,
    setControllerModules,
    setDevice,
    setDeviceAudioEndpoint,
    setDevices,
    setGooseMode,
    setGoosePttScope,
    setMediaDevices,
    setPreferredGooseId,
    setUserMediaOverride,
    replaceUserMediaOverrides,
    clearUserMediaOverrides,
  }
})
