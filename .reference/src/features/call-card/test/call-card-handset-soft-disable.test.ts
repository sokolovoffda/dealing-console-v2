import { isFooterHandsetClickDisabled } from '../model/call-card-handset-click'
import {
  getCallCardHandsetSlots,
  isCallCardHandsetAvailable,
  resolveCallCardHandsetId,
} from '../model/call-card-handset-slots'
import { CALL_CARD_HANDSET_IDS, type CallCardHandsetSlot } from '../model/types'

const createHandsetDevice = (overrides: {
  id?: string
  enabled?: boolean
  status?: 'ready' | 'missing'
} = {}) => ({
  id: overrides.id ?? 'handset_L1',
  name: 'Handset',
  type: 'handset' as const,
  order: 1,
  icon: 'phone' as const,
  iconNumber: '1',
  origin: 'controller' as const,
  hasInput: true,
  hasOutput: true,
  status: overrides.status ?? 'ready' as const,
  enabled: overrides.enabled ?? true,
  volume: 50,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  module: overrides.id ?? 'handset_L1',
})

describe('call-card soft-disable handset availability', () => {
  it('should treat disabled ready handset as unavailable for media', () => {
    // Arrange
    const device = createHandsetDevice({ enabled: false })

    // Act / Assert
    expect(isCallCardHandsetAvailable(device)).toBe(false)
  })

  it('should auto-select the only enabled handset slot', () => {
    // Arrange
    const slots = getCallCardHandsetSlots([
      createHandsetDevice({ id: 'handset_L1', enabled: false }),
      createHandsetDevice({ id: 'handset_L2', enabled: true }),
    ])

    // Act
    const selectedId = resolveCallCardHandsetId(slots, CALL_CARD_HANDSET_IDS.left)

    // Assert
    expect(selectedId).toBe(CALL_CARD_HANDSET_IDS.right)
    expect(slots[0].isAvailable).toBe(false)
    expect(slots[1].isAvailable).toBe(true)
  })

  it('should keep requested handset selected when both are disabled', () => {
    // Arrange
    const slots = getCallCardHandsetSlots([
      createHandsetDevice({ id: 'handset_L1', enabled: false }),
      createHandsetDevice({ id: 'handset_L2', enabled: false }),
    ])

    // Act
    const selectedId = resolveCallCardHandsetId(slots, CALL_CARD_HANDSET_IDS.left)

    // Assert
    expect(selectedId).toBe(CALL_CARD_HANDSET_IDS.left)
  })

  it('should disable footer click without activity and allow click with activity', () => {
    // Arrange
    const disabledSlot: CallCardHandsetSlot = {
      id: CALL_CARD_HANDSET_IDS.left,
      title: 'Левая',
      device: createHandsetDevice({ enabled: false }),
      runtimeKey: 'handset_L1',
      isAvailable: false,
      disabled: true,
    }

    // Act / Assert
    expect(isFooterHandsetClickDisabled(disabledSlot, false)).toBe(true)
    expect(isFooterHandsetClickDisabled(disabledSlot, true)).toBe(false)
  })
})
