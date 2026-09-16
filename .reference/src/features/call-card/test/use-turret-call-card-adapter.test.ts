import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import type { CallCardSessionViewModel } from '../model/types'
import { useTurretCallCardAdapter } from '../model/use-turret-call-card-adapter'

const mocks = vi.hoisted(() => ({
  getCallCardSessionViewModel: vi.fn(),
  getSlotBySessionId: vi.fn(),
  mapCallHistoryToCallCardEntries: vi.fn(() => []),
}))

const callCardState = {
  availableHandsetSlots: ref([] as Array<{ id: string }>),
  canMoveSelectedSessionToPinnedPanel: ref(false),
  canSelectNextQueuePosition: ref(true),
  canSelectPreviousQueuePosition: ref(false),
  isPinnedPresentation: ref(false),
  isSelectedConsultationConnected: ref(false),
  isSelectedMuted: ref(false),
  isSelectedTransferModeActive: ref(false),
  selectedConsultationSession: ref(null),
  selectedDialBuffer: ref(''),
  selectedDialContactName: ref(''),
  selectedDialSelectionEnd: ref<number | null>(null),
  selectedDialSelectionStart: ref<number | null>(null),
  selectedHandsetId: ref('left'),
  selectedHandsetQueue: ref([] as unknown[]),
  selectedHandsetSlot: ref<{ id: 'left' | 'right', title: string } | null>({
    id: 'left',
    title: 'Левая',
  }),
  selectedPanelMode: ref('queue'),
  selectedQueuePosition: ref(1),
  selectedQueueTotal: ref(1),
  selectedSession: ref<{ sessionId: string } | null>(null),
  selectedSessionView: ref<CallCardSessionViewModel | null>(null),
  selectedTransferSourceSession: ref<{ sessionId: string } | null>(null),
  selectedTransferState: ref({
    consultationStage: 'idle' as 'idle' | 'starting' | 'active',
    sourceSessionId: null as string | null,
    targetName: '',
    targetNumber: '',
    targetSelectionStart: null as number | null,
    targetSelectionEnd: null as number | null,
    targetSessionId: null as string | null,
  }),
  selectedVolume: ref(1),
  answerSelectedSession: vi.fn(),
  callSelectedDialNumber: vi.fn(),
  cancelSelectedConsultationCall: vi.fn(),
  executeSelectedBlindTransfer: vi.fn(),
  executeSelectedConsultationMerge: vi.fn(),
  hide: vi.fn(),
  moveSelectedSessionToPinnedPanel: vi.fn(),
  selectNextSelectedQueuePosition: vi.fn(),
  selectPreviousSelectedQueuePosition: vi.fn(),
  setSelectedDialBuffer: vi.fn(),
  setSelectedDialContactName: vi.fn(),
  setSelectedDialSelection: vi.fn(),
  setSelectedDialTarget: vi.fn(),
  setSelectedHandsetMuted: vi.fn(),
  setSelectedHandsetSessionId: vi.fn(),
  setSelectedHandsetVolume: vi.fn(),
  setSelectedPanelMode: vi.fn(),
  setSelectedTransferTarget: vi.fn(),
  setSelectedTransferTargetSelection: vi.fn(),
  setSelectedTransferTargetSession: vi.fn(),
  startSelectedConsultationCall: vi.fn(),
  toggleSelectedSessionHold: vi.fn(),
  toggleSelectedTransferMode: vi.fn(),
  transferSelectedSessionToOtherHandset: vi.fn(),
}

const calls = ref([])
const currentUser = ref(null)
const readyPreferredGoose = ref(null)

vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pinia')>()

  return {
    ...actual,
    storeToRefs: (store: Record<string, unknown>) => store,
  }
})

vi.mock('../model/use-call-card-store', () => ({
  useCallCardStore: () => callCardState,
}))

vi.mock('../model/call-card-session-view', () => ({
  getCallCardSessionViewModel: mocks.getCallCardSessionViewModel,
}))

vi.mock('../model/call-card-history', () => ({
  mapCallHistoryToCallCardEntries: mocks.mapCallHistoryToCallCardEntries,
}))

vi.mock('@/entities/pinned-calls', () => ({
  usePinnedCallsPanelStore: () => ({
    getSlotBySessionId: mocks.getSlotBySessionId,
  }),
}))

vi.mock('@/entities/call-history', () => ({
  useCallHistoryStore: () => ({
    calls,
  }),
}))

vi.mock('@/shared/composables', () => ({
  useAppStore: () => ({
    currentUser,
  }),
  useDevicesStore: () => ({
    readyPreferredGoose,
  }),
}))

const createSessionView = (
  overrides: Partial<CallCardSessionViewModel> = {},
): CallCardSessionViewModel => ({
  actions: {
    canAnswer: false,
    canHangup: true,
    canHold: true,
    canOpenDialpad: true,
    canOpenQueue: true,
    canTransfer: true,
    canUnhold: false,
  },
  colorStatus: 'active',
  controlLayout: 'sessionCommon',
  direction: 'outgoing',
  duration: '00:00:01',
  icon: 'phoneCallF',
  isHighPriority: false,
  name: 'Иванов',
  number: '100',
  sessionId: 'session-1',
  state: 'active',
  tone: 'callcon',
  ...overrides,
})

describe('useTurretCallCardAdapter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    callCardState.isPinnedPresentation.value = false
    callCardState.isSelectedTransferModeActive.value = false
    callCardState.isSelectedConsultationConnected.value = false
    callCardState.canMoveSelectedSessionToPinnedPanel.value = true
    callCardState.canSelectPreviousQueuePosition.value = false
    callCardState.canSelectNextQueuePosition.value = true
    callCardState.selectedQueuePosition.value = 1
    callCardState.selectedQueueTotal.value = 2
    callCardState.selectedHandsetSlot.value = { id: 'left', title: 'Левая' }
    callCardState.selectedHandsetId.value = 'left'
    callCardState.availableHandsetSlots.value = [{ id: 'left' }, { id: 'right' }]
    callCardState.selectedSession.value = { sessionId: 'session-1' }
    callCardState.selectedSessionView.value = createSessionView()
    callCardState.selectedHandsetQueue.value = []
    callCardState.selectedTransferSourceSession.value = null
    callCardState.selectedTransferState.value = {
      consultationStage: 'idle',
      sourceSessionId: null,
      targetName: '',
      targetNumber: '',
      targetSelectionStart: null,
      targetSelectionEnd: null,
      targetSessionId: null,
    }
    callCardState.selectedDialContactName.value = ''
    callCardState.selectedDialBuffer.value = ''
    mocks.getCallCardSessionViewModel.mockReset()
    mocks.getSlotBySessionId.mockReset()
    mocks.mapCallHistoryToCallCardEntries.mockReset()
    mocks.mapCallHistoryToCallCardEntries.mockReturnValue([])
  })

  it('should map handset capabilities and queue navigator edges', () => {
    // Arrange
    callCardState.isPinnedPresentation.value = false
    callCardState.canSelectPreviousQueuePosition.value = false
    callCardState.canSelectNextQueuePosition.value = true

    // Act
    const { cardProps } = useTurretCallCardAdapter()

    // Assert
    expect(cardProps.value.capabilities).toEqual({
      pin: true,
      handsetSwap: true,
      transfer: true,
      history: true,
      queue: true,
    })
    expect(cardProps.value.canSelectQueuePrevious).toBe(false)
    expect(cardProps.value.canSelectQueueNext).toBe(true)
    expect(cardProps.value.transfer).toBeNull()
    expect(cardProps.value.handsetSide).toBe('left')
  })

  it('should map pinned capabilities and keep dialpad/queue without transfer', () => {
    // Arrange
    callCardState.isPinnedPresentation.value = true
    callCardState.canSelectPreviousQueuePosition.value = false
    callCardState.canSelectNextQueuePosition.value = false
    callCardState.selectedQueuePosition.value = 1
    callCardState.selectedQueueTotal.value = 1

    // Act
    const { cardProps } = useTurretCallCardAdapter()

    // Assert
    expect(cardProps.value.capabilities).toEqual({
      pin: false,
      handsetSwap: false,
      transfer: false,
      history: false,
      queue: true,
    })
    expect(cardProps.value.transfer).toBeNull()
    expect(cardProps.value.historyItems).toEqual([])
    expect(cardProps.value.canSelectQueuePrevious).toBe(false)
    expect(cardProps.value.canSelectQueueNext).toBe(false)
  })

  it('should mirror right handset side and canHandsetSwap from available slots', () => {
    // Arrange
    callCardState.selectedHandsetSlot.value = { id: 'right', title: 'Правая' }
    callCardState.selectedHandsetId.value = 'right'
    callCardState.availableHandsetSlots.value = [{ id: 'left' }, { id: 'right' }]
    callCardState.selectedSessionView.value = createSessionView()

    // Act
    const { cardProps } = useTurretCallCardAdapter()

    // Assert
    expect(cardProps.value.handsetSide).toBe('right')
    expect(cardProps.value.session?.actions.canHandsetSwap).toBe(true)
    expect(cardProps.value.session?.actions.canPin).toBe(true)
  })

  it('should put source session name into transfer.targetName during consultation', () => {
    // Arrange
    callCardState.isSelectedTransferModeActive.value = true
    callCardState.isSelectedConsultationConnected.value = true
    callCardState.selectedTransferState.value = {
      consultationStage: 'active',
      sourceSessionId: 'source-1',
      targetName: 'Цель',
      targetNumber: '200',
      targetSelectionStart: null,
      targetSelectionEnd: null,
      targetSessionId: 'target-1',
    }
    callCardState.selectedTransferSourceSession.value = { sessionId: 'source-1' }
    mocks.getCallCardSessionViewModel.mockReturnValue(
      createSessionView({
        sessionId: 'source-1',
        name: 'Источник',
        number: '100',
      }),
    )

    // Act
    const { cardProps } = useTurretCallCardAdapter()

    // Assert
    expect(cardProps.value.transfer).toEqual({
      stage: 'active',
      targetName: 'Источник',
      targetNumber: '200',
      canBlind: true,
      canConsult: true,
      canMerge: true,
      canCancel: true,
    })
  })

  it('should use pinned micOffM icon when active slot mic is off', () => {
    // Arrange
    callCardState.isPinnedPresentation.value = true
    const queueSession = {
      sessionId: 'session-1',
      currentDevice: { value: null },
    }
    callCardState.selectedHandsetQueue.value = [queueSession]
    mocks.getCallCardSessionViewModel.mockReturnValue(
      createSessionView({
        sessionId: 'session-1',
        state: 'active',
        icon: 'phoneCallF',
      }),
    )
    mocks.getSlotBySessionId.mockReturnValue({
      order: 1,
      micState: false,
    })

    // Act
    const { cardProps } = useTurretCallCardAdapter()

    // Assert
    expect(cardProps.value.queue).toHaveLength(1)
    expect(cardProps.value.queue[0]?.icon).toBe('micOffM')
  })

  it('should fallback empty dial contactName to handset title with трубка', () => {
    // Arrange
    callCardState.selectedSessionView.value = null
    callCardState.selectedDialContactName.value = ''
    callCardState.selectedDialBuffer.value = ''
    callCardState.selectedHandsetSlot.value = { id: 'right', title: 'Правая' }

    // Act
    const { cardProps } = useTurretCallCardAdapter()

    // Assert
    expect(cardProps.value.session).toBeNull()
    expect(cardProps.value.dial.contactName).toBe('Правая трубка')
    expect(cardProps.value.handsetSide).toBe('right')
  })
})
