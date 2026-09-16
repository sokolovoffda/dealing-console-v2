import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { vi } from 'vitest'

const setPreferencesMock = vi.fn(() => Promise.resolve())
const paintGooseButtonMock = vi.fn()
const getPreferredSessionByPServedMock = vi.fn()
const getFirstPinnedCallByPServedMock = vi.fn()
const getSessionForPinnedCallMock = vi.fn()
const isPServedSessionMock = vi.fn(() => false)
const isPinnedCallMicEffectiveMock = vi.fn(() => false)
const sessionsMock = ref(new Map())

vi.mock('@/entities/preference', () => ({
  usePreferencesStore: () => ({
    setPreferences: setPreferencesMock,
  }),
}))

vi.mock('@/entities/call-session', () => ({
  STATE: {
    PROGRESS: 'progress',
    RINGING: 'ringing',
    ONHOLD: 'onhold',
    CONNECTED: 'connected',
  },
  useSessionStore: () => ({
    sessions: sessionsMock,
    getPreferredSessionByPServed: getPreferredSessionByPServedMock,
  }),
  usePinnedCallsStore: () => ({
    pinnedCalls: new Map(),
    isPServedSession: isPServedSessionMock,
    isPinnedCallMicEffective: isPinnedCallMicEffectiveMock,
    getFirstPinnedCallByPServed: getFirstPinnedCallByPServedMock,
    getSessionForPinnedCall: getSessionForPinnedCallMock,
  }),
}))

vi.mock('@/entities/contact', () => ({
  CallStatusState: {
    EARLY: 'early',
    HOLD: 'hold',
  },
  useContactStatusState: () => ({
    contactStatuses: {},
  }),
}))

vi.mock('@/entities/group-contacts', () => ({
  useGroupContactsStore: () => ({
    groupContacts: new Map(),
    getGroupByIdx: () => undefined,
  }),
}))

vi.mock('@/shared/composables', () => ({
  useAppStore: () => ({
    currentUser: null,
  }),
  useDevicesStore: () => ({
    gooseDevices: [
      { module: 'goose_L1' },
    ],
  }),
}))

vi.mock('@/shared/controller', () => ({
  gooseButtons: {
    transformValues: () => ({
      KEY_SPEAK: 'goose_L1_key_speak',
    }),
    getValues: () => [
      'goose_L1_btn_1',
      'goose_L1_btn_2',
      'goose_L1_key_speak',
    ],
  },
  useController: () => ({
    paintGooseButton: paintGooseButtonMock,
  }),
}))

vi.mock('@/shared/controller/constants', () => ({
  GOOSE: 'goose',
}))

vi.mock('@/shared/services', () => ({
  contactPServedToNumber: (pServed: string) => pServed.replace('<sip:', '').replace('@ROOT>', ''),
}))

const loadStore = async () => import('./use-binding-controller-buttons-store')

describe('useBindingControllerButtonsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setPreferencesMock.mockClear()
    paintGooseButtonMock.mockClear()
    getPreferredSessionByPServedMock.mockReset()
    getFirstPinnedCallByPServedMock.mockReset()
    getSessionForPinnedCallMock.mockReset()
    isPServedSessionMock.mockReset()
    isPinnedCallMicEffectiveMock.mockReset()
    sessionsMock.value = new Map()
    isPServedSessionMock.mockReturnValue(false)
    isPinnedCallMicEffectiveMock.mockReturnValue(false)
    getFirstPinnedCallByPServedMock.mockReturnValue(undefined)
  })

  it('loads legacy bindings as standard type', async () => {
    const { useBindingControllerButtonsStore, bindingControllerButtonTypes } = await loadStore()
    const store = useBindingControllerButtonsStore()

    store.loadByPreferences({
      goose_L1_btn_1: '<sip:1234@ROOT>',
      goose_L1_btn_2: null,
    })

    expect(store.getBinding('goose_L1_btn_1')).toEqual({
      type: bindingControllerButtonTypes.STANDARD,
      pServed: '<sip:1234@ROOT>',
    })
    expect(store.getBinding('goose_L1_btn_2')).toEqual({
      type: bindingControllerButtonTypes.STANDARD,
      pServed: null,
    })
  })

  it('keeps only one active assignment for the same pinned group when loading preferences', async () => {
    const { useBindingControllerButtonsStore, bindingControllerButtonTypes } = await loadStore()
    const store = useBindingControllerButtonsStore()

    store.loadByPreferences({
      goose_L1_btn_1: {
        type: bindingControllerButtonTypes.PINNED_GROUP,
        groupIndex: 0,
      },
      goose_L1_btn_2: {
        type: bindingControllerButtonTypes.PINNED_GROUP,
        groupIndex: 0,
      },
    })

    expect(store.getBinding('goose_L1_btn_1')).toEqual({
      type: bindingControllerButtonTypes.PINNED_GROUP,
      groupIndex: 0,
    })
    expect(store.getBinding('goose_L1_btn_2')).toEqual({
      type: bindingControllerButtonTypes.PINNED_GROUP,
      groupIndex: null,
    })
  })

  it('saves the new binding format to preferences', async () => {
    const { useBindingControllerButtonsStore, bindingControllerButtonTypes } = await loadStore()
    const store = useBindingControllerButtonsStore()

    store.setPinnedGroup('goose_L1_btn_1', 1)
    store.setContact('goose_L1_btn_2', '<sip:4321@ROOT>')
    await store.save()

    expect(setPreferencesMock).toHaveBeenCalledWith('bindings', {
      goose_L1_btn_1: {
        type: bindingControllerButtonTypes.PINNED_GROUP,
        groupIndex: 1,
      },
      goose_L1_btn_2: {
        type: bindingControllerButtonTypes.STANDARD,
        pServed: '<sip:4321@ROOT>',
      },
    })
  })

  it('does not fail when a session has no current device ref', async () => {
    const { useBindingControllerButtonsStore } = await loadStore()
    useBindingControllerButtonsStore()

    sessionsMock.value = new Map([
      ['session-1', {
        pServed: '<sip:1234@ROOT>',
        sessionState: { value: 'ringing' },
        isMuted: { value: false },
        currentDevice: null,
      }],
    ])
    await nextTick()

    expect(paintGooseButtonMock).toHaveBeenCalled()
  })

  it('paints standard binding from preferred session when several sessions share one pServed', async () => {
    getPreferredSessionByPServedMock.mockReturnValue({
      sessionState: { value: 'connected' },
      isMuted: { value: true },
    })

    const { useBindingControllerButtonsStore } = await loadStore()
    const store = useBindingControllerButtonsStore()

    store.setContact('goose_L1_btn_1', '<sip:1234@ROOT>')
    paintGooseButtonMock.mockClear()

    store.paintGooseButtons()

    expect(getPreferredSessionByPServedMock).toHaveBeenCalledWith('<sip:1234@ROOT>')
    expect(paintGooseButtonMock).toHaveBeenCalledWith({
      target: 'goose_L1_btn_1',
      color: 'green',
      freq: 0,
    })
  })

  it('uses first pinned slot session for pinned binding visual state', async () => {
    isPinnedCallMicEffectiveMock.mockReturnValue(true)
    const firstPinnedCall = {
      pServed: '<sip:1234@ROOT>',
      slotIndex: 1,
      order: 1,
    }
    getFirstPinnedCallByPServedMock.mockReturnValue(firstPinnedCall)
    getSessionForPinnedCallMock.mockReturnValue({
      sessionState: { value: 'connected' },
      isMuted: { value: true },
    })
    getPreferredSessionByPServedMock.mockReturnValue({
      sessionState: { value: 'onhold' },
      isMuted: { value: false },
    })

    const { useBindingControllerButtonsStore } = await loadStore()
    const store = useBindingControllerButtonsStore()

    store.setContact('goose_L1_btn_1', '<sip:1234@ROOT>')
    paintGooseButtonMock.mockClear()

    store.paintGooseButtons()

    expect(getFirstPinnedCallByPServedMock).toHaveBeenCalledWith('<sip:1234@ROOT>')
    expect(getSessionForPinnedCallMock).toHaveBeenCalledWith(firstPinnedCall)
    expect(paintGooseButtonMock).toHaveBeenCalledWith({
      target: 'goose_L1_btn_1',
      color: 'red',
      freq: 0,
    })
  })
})
