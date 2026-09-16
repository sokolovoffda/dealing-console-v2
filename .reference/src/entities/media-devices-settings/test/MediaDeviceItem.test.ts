import { shallowMount } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'
import { createI18n } from 'vue-i18n'

import Component from '../ui/MediaDeviceItem.vue'

const {
  startMediaDeviceOutputTest,
  stopMediaDeviceOutputTest,
  setMediaDeviceOutputTestVolume,
} = vi.hoisted(() => ({
  startMediaDeviceOutputTest: vi.fn().mockResolvedValue(undefined),
  stopMediaDeviceOutputTest: vi.fn(),
  setMediaDeviceOutputTestVolume: vi.fn(),
}))

const setDeviceAudioEndpoint = vi.fn()
const globalVolumeMultiplier = ref(0.7)
const changeGlobalVolumeMultiplier = vi.fn((value: number) => {
  globalVolumeMultiplier.value = value
})

const overridesWorking = ref<Record<string, {
  logicalKey: string
  enabled: boolean
  volume: number
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}>>({})

const getResolvedOverride = (logicalKey: string) => {
  return overridesWorking.value[logicalKey] ?? {
    logicalKey,
    enabled: true,
    volume: 50,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
}

const patchDevice = vi.fn((logicalKey: string, patch: Record<string, unknown>) => {
  overridesWorking.value = {
    ...overridesWorking.value,
    [logicalKey]: {
      ...getResolvedOverride(logicalKey),
      ...patch,
      logicalKey,
    },
  }
})

const devicesStoreMock = {
  audioInputs: [
    { deviceId: 'input-id', label: 'Mic 1' },
    { deviceId: 'input-2', label: 'Mic 2' },
  ],
  audioOutputs: [
    { deviceId: 'output-id', label: 'Speaker 1' },
  ],
  isMockControllerModules: false,
  setDeviceAudioEndpoint,
}

vi.mock('@/entities/pinned-calls', () => ({
  usePinnedCallsPanelStore: () => ({
    globalVolumeMultiplier,
    changeGlobalVolumeMultiplier,
  }),
}))

vi.mock('../lib/media-device-output-test', () => ({
  startMediaDeviceOutputTest,
  stopMediaDeviceOutputTest,
  setMediaDeviceOutputTestVolume,
}))

vi.mock('../model/use-media-device-overrides-store', () => ({
  useMediaDeviceOverridesStore: () => ({
    getResolvedOverride,
    patchDevice,
  }),
}))

vi.mock('@/shared/composables', () => ({
  LogicalMediaDeviceIconEnum: {
    MIC_SPEAKER: 'micSpeaker',
    PHONE: 'phone',
    SPEAKER: 'speaker',
  },
  LogicalMediaDeviceTypeEnum: {
    GOOSE: 'goose',
    HANDSET: 'handset',
    HEADSET: 'headset',
    MAIN: 'main',
    INPUT: 'input',
    OUTPUT: 'output',
    OTHER: 'other',
  },
  useAppStore: () => ({
    currentUser: null,
  }),
  useAutoAnswer: () => ({
    checkAutoAnswerAndGetDevice: vi.fn(),
  }),
  useConfigurationState: () => ({
    configuration: null,
  }),
  useDevicesSessionsStore: () => ({
    bindSessionToDevice: vi.fn(),
  }),
  useDevicesStore: () => devicesStoreMock,
  useStatusSubscribe: () => ({
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}))

vi.mock('@/shared/i18n', () => ({
  useLocalization: () => ({
    t: (key: string) => key,
  }),
}))

const i18n = createI18n({})

const LogicalDeviceType = {
  GOOSE: 'goose',
  HANDSET: 'handset',
  MAIN: 'main',
} as const

const mountComponent = (device = {}) => shallowMount(Component, {
  props: {
    device: {
      autoGainControl: true,
      echoCancellation: true,
      enabled: true,
      hasInput: true,
      hasOutput: true,
      icon: 'phone',
      iconNumber: '1',
      id: 'handset_L2',
      inputId: 'input-id',
      inputLabel: 'Module_L2',
      module: 'handset_L2',
      name: 'Handset 1',
      noiseSuppression: true,
      order: 1,
      origin: 'controller',
      outputId: 'output-id',
      outputLabel: 'Module_L2',
      status: 'ready',
      type: LogicalDeviceType.HANDSET,
      volume: 50,
      ...device,
    },
  },
  global: {
    plugins: [i18n],
    stubs: {
      'wui-input': {
        props: ['modelValue', 'readonly', 'size'],
        template: '<div data-stub="wui-input">{{ modelValue }}</div>',
      },
      'wui-input-switch': {
        props: ['modelValue', 'label'],
        template: '<div data-test="media-device-enabled">{{ label }}</div>',
      },
      'wui-select': {
        props: ['modelValue', 'items', 'size'],
        template: '<div data-stub="wui-select">{{ modelValue }}</div>',
      },
      'wui-input-range': {
        props: ['modelValue', 'min', 'max', 'step', 'size'],
        emits: ['update:modelValue'],
        template: `
          <div
            data-stub="wui-input-range"
            data-test="media-device-volume"
            @click="$emit('update:modelValue', 40)"
          >{{ modelValue }}</div>
        `,
      },
      'wui-btn': {
        props: ['prependIcon', 'disabled', 'size'],
        template: '<button data-test="media-device-play" type="button" />',
      },
      MediaDeviceVadIndicator: {
        props: ['inputId'],
        template: '<div data-test="media-device-vad" />',
      },
    },
  },
})

describe('MediaDeviceItem', () => {
  beforeEach(() => {
    devicesStoreMock.isMockControllerModules = false
    setDeviceAudioEndpoint.mockClear()
    changeGlobalVolumeMultiplier.mockClear()
    patchDevice.mockClear()
    overridesWorking.value = {}
    startMediaDeviceOutputTest.mockClear()
    stopMediaDeviceOutputTest.mockClear()
    setMediaDeviceOutputTestVolume.mockClear()
    globalVolumeMultiplier.value = 0.7
  })

  it('should render connected switch at the top', () => {
    // Arrange
    const wrapper = mountComponent()

    // Assert
    expect(wrapper.find('[data-test="media-device-enabled"]').exists()).toBe(true)
    expect(wrapper.html()).toContain('DeviceConnected')
  })

  it('should hide connected switch for main speaker', () => {
    // Arrange
    const wrapper = mountComponent({
      hasInput: false,
      hasOutput: true,
      id: 'hub',
      inputId: undefined,
      inputLabel: undefined,
      module: 'hub',
      name: 'Основной динамик',
      type: LogicalDeviceType.MAIN,
    })

    // Assert
    expect(wrapper.html()).not.toContain('DeviceConnected')
  })

  it('should render type status name and module as readonly fields', () => {
    // Arrange
    const wrapper = mountComponent()

    // Act
    const html = wrapper.html()

    // Assert
    expect(wrapper.find('[data-test="media-device-field-type"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="media-device-field-status"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="media-device-field-name"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="media-device-field-module"]').exists()).toBe(true)
    expect(html).toContain('Telephone')
    expect(html).toContain('MediaDeviceStatusReady')
    expect(html).toContain('Handset 1')
    expect(html).toContain('handset_L2')
  })

  it('should render audio input and output as readonly when controller is real', () => {
    // Arrange
    const wrapper = mountComponent()

    // Assert
    expect(wrapper.find('[data-test="media-device-field-audio-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="media-device-field-audio-output"]').exists()).toBe(true)
    expect(wrapper.find('[data-stub="wui-select"]').exists()).toBe(false)
    expect(wrapper.html()).toContain('Module_L2')
  })

  it('should render audio selects when mock controller modules are enabled', () => {
    // Arrange
    devicesStoreMock.isMockControllerModules = true
    const wrapper = mountComponent()

    // Assert
    const selects = wrapper.findAll('[data-stub="wui-select"]')
    expect(selects).toHaveLength(2)
    expect(selects[0].text()).toBe('input-id')
    expect(selects[1].text()).toBe('output-id')
  })

  it('should render vad meter when device has input', () => {
    // Arrange
    const wrapper = mountComponent()

    // Assert
    expect(wrapper.find('[data-test="media-device-vad"]').exists()).toBe(true)
  })

  it('should render volume and play when device has output', () => {
    // Arrange
    const wrapper = mountComponent()

    // Assert
    expect(wrapper.find('[data-test="media-device-output-controls"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="media-device-play"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="media-device-volume-percent"]').text()).toBe('50%')
  })

  it('should sync main speaker volume with footer globalVolumeMultiplier', async () => {
    // Arrange
    const wrapper = mountComponent({
      hasInput: false,
      hasOutput: true,
      id: 'hub',
      inputId: undefined,
      inputLabel: undefined,
      module: 'hub',
      name: 'Основной динамик',
      type: LogicalDeviceType.MAIN,
    })

    // Assert
    expect(wrapper.find('[data-test="media-device-volume-percent"]').text()).toBe('70%')

    // Act
    await wrapper.find('[data-test="media-device-volume"]').trigger('click')

    // Assert
    expect(changeGlobalVolumeMultiplier).toHaveBeenCalledWith(0.4)
    expect(patchDevice).toHaveBeenCalledWith('hub', { volume: 40 })
    expect(wrapper.find('[data-test="media-device-volume-percent"]').text()).toBe('40%')
  })

  it('should play sound check to device output id', async () => {
    // Arrange
    const wrapper = mountComponent({
      outputId: 'handset-out-1',
    })

    // Act
    await wrapper.find('[data-test="media-device-play"]').trigger('click')

    // Assert
    expect(startMediaDeviceOutputTest).toHaveBeenCalledWith(expect.objectContaining({
      outputId: 'handset-out-1',
      volume: 0.5,
    }))
  })

  it('should hide audio fields when device has no input or output', () => {
    // Arrange
    const wrapper = mountComponent({
      hasInput: false,
      hasOutput: false,
      inputLabel: undefined,
      outputLabel: undefined,
    })

    // Assert
    expect(wrapper.find('[data-test="media-device-field-audio-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="media-device-field-audio-output"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="media-device-audio-processing"]').exists()).toBe(false)
  })

  it('should render aec switches below fields when device has input', () => {
    // Arrange
    const wrapper = mountComponent()

    // Assert
    expect(wrapper.find('[data-test="media-device-audio-processing"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="media-device-echo-cancellation"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="media-device-noise-suppression"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="media-device-auto-gain-control"]').exists()).toBe(true)
  })

  it('should hide aec switches for output-only device', () => {
    // Arrange
    const wrapper = mountComponent({
      hasInput: false,
      hasOutput: true,
      inputLabel: undefined,
    })

    // Assert
    expect(wrapper.find('[data-test="media-device-audio-processing"]').exists()).toBe(false)
  })

  it('should show NoDevices when audio label is missing', () => {
    // Arrange
    const wrapper = mountComponent({
      inputLabel: undefined,
      outputLabel: undefined,
    })

    // Assert
    expect(wrapper.html()).toContain('NoDevices')
  })

  it('should show dash when module is missing', () => {
    // Arrange
    const wrapper = mountComponent({
      module: undefined,
    })

    // Assert
    expect(wrapper.html()).toContain('—')
  })

  it('should apply status color class for missing and partial', () => {
    // Arrange
    const missingWrapper = mountComponent({ status: 'missing' })
    const partialWrapper = mountComponent({ status: 'partial' })
    const readyWrapper = mountComponent({ status: 'ready' })

    // Assert
    expect(missingWrapper.find('[data-test="media-device-value-status"]').classes())
      .toContain('media-device-readonly-input--status-missing')
    expect(partialWrapper.find('[data-test="media-device-value-status"]').classes())
      .toContain('media-device-readonly-input--status-partial')
    expect(readyWrapper.find('[data-test="media-device-value-status"]').classes())
      .not.toContain('media-device-readonly-input--status-missing')
    expect(readyWrapper.find('[data-test="media-device-value-status"]').classes())
      .not.toContain('media-device-readonly-input--status-partial')
  })
})
