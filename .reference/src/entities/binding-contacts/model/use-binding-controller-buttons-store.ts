import { PServed } from '@wui/im'
import { defineStore } from 'pinia'
import { computed, readonly, ref, watch } from 'vue'

import { STATE, usePinnedCallsStore, useSessionStore } from '@/entities/call-session'
import { CallStatusState, SubscriberStatus, useContactStatusState } from '@/entities/contact'
import { useGroupContactsStore } from '@/entities/group-contacts'
import { usePreferencesStore } from '@/entities/preference'

import { useAppStore, useDevicesStore } from '@/shared/composables'
import { gooseButtons, useController } from '@/shared/controller'
import { GOOSE } from '@/shared/controller/constants'
import { contactPServedToNumber } from '@/shared/services'

export const bindingControllerButtonTypes = {
  STANDARD: 'standard',
  PINNED_GROUP: 'pinned-group',
} as const

export type BindingControllerButtonType = typeof bindingControllerButtonTypes[keyof typeof bindingControllerButtonTypes]

export type StandardBindingControllerButton = {
  type: typeof bindingControllerButtonTypes.STANDARD
  pServed: PServed | null
}

export type PinnedGroupBindingControllerButton = {
  type: typeof bindingControllerButtonTypes.PINNED_GROUP
  groupIndex: number | null
}

export type BindingControllerButton = StandardBindingControllerButton | PinnedGroupBindingControllerButton

export type BindingControllerButtonPreferenceValue = PServed | null | BindingControllerButton
type GooseButtonVisualState = {
  color: 'red' | 'green' | 'orange' | 'black'
  freq: number
}

const createStandardBindingControllerButton = (pServed: PServed | null = null): StandardBindingControllerButton => ({
  type: bindingControllerButtonTypes.STANDARD,
  pServed,
})

const createPinnedGroupBindingControllerButton = (groupIndex: number | null = null): PinnedGroupBindingControllerButton => ({
  type: bindingControllerButtonTypes.PINNED_GROUP,
  groupIndex,
})

const normalizeBindingControllerButton = (
  value: BindingControllerButtonPreferenceValue | undefined,
): BindingControllerButton => {
  if (value === null || value === undefined || typeof value === 'string') {
    return createStandardBindingControllerButton(value ?? null)
  }

  if (value.type === bindingControllerButtonTypes.PINNED_GROUP) {
    return createPinnedGroupBindingControllerButton(typeof value.groupIndex === 'number' ? value.groupIndex : null)
  }

  return createStandardBindingControllerButton(value.pServed ?? null)
}

export const useBindingControllerButtonsStore = defineStore('binding-controller-buttons-store', () => {
  const { setPreferences } = usePreferencesStore()
  const { paintGooseButton } = useController()
  const sessionStore = useSessionStore()
  const pinnedCallsStore = usePinnedCallsStore()
  const contactStatusStore = useContactStatusState()
  const appStore = useAppStore()
  const groupContactsStore = useGroupContactsStore()
  const devicesStore = useDevicesStore()

  const bindings = ref(new Map<string, BindingControllerButton>())
  const bindingContacts = computed(() => new Map(Array.from(bindings.value.entries()).map(([button, binding]) => {
    return [button, binding.type === bindingControllerButtonTypes.STANDARD ? binding.pServed : null]
  })))

  const getBinding = (button: string): BindingControllerButton | undefined => {
    return bindings.value.get(button)
  }

  const hasPinnedGroupBinding = (groupIndex: number, excludedButton?: string): boolean => {
    for (const [button, binding] of bindings.value) {
      if (button === excludedButton) {
        continue
      }

      if (binding.type === bindingControllerButtonTypes.PINNED_GROUP && binding.groupIndex === groupIndex) {
        return true
      }
    }

    return false
  }

  const setBinding = (button: string, binding: BindingControllerButton) => {
    if (
      binding.type === bindingControllerButtonTypes.PINNED_GROUP &&
      binding.groupIndex !== null &&
      hasPinnedGroupBinding(binding.groupIndex, button)
    ) {
      console.warn(`Группа ${binding.groupIndex + 1} уже привязана к другой кнопке`)
      return false
    }

    bindings.value.set(button, binding)
    return true
  }

  const setContact = (button: string, contact: PServed | null) => {
    if (contact) {
      console.debug(`Контакт ${contact} привязан к кнопке ${button}`)
    } else {
      console.debug(`Контакт отвязан от кнопки ${button}`)
    }
    return setBinding(button, createStandardBindingControllerButton(contact))
  }

  const setBindingType = (button: string, type: BindingControllerButtonType) => {
    const currentBinding = bindings.value.get(button)

    if (type === bindingControllerButtonTypes.PINNED_GROUP) {
      if (currentBinding?.type === bindingControllerButtonTypes.PINNED_GROUP) {
        return true
      }

      return setBinding(button, createPinnedGroupBindingControllerButton())
    }

    if (currentBinding?.type === bindingControllerButtonTypes.STANDARD) {
      return true
    }

    return setBinding(button, createStandardBindingControllerButton())
  }

  const setPinnedGroup = (button: string, groupIndex: number | null) => {
    if (groupIndex !== null) {
      console.debug(`Pinned group ${groupIndex + 1} assigned to button ${button}`)
    } else {
      console.debug(`Pinned group unassigned from button ${button}`)
    }

    return setBinding(button, createPinnedGroupBindingControllerButton(groupIndex))
  }

  const clearBinding = (button: string) => {
    const currentBinding = bindings.value.get(button)

    if (currentBinding?.type === bindingControllerButtonTypes.PINNED_GROUP) {
      return setPinnedGroup(button, null)
    }

    return setContact(button, null)
  }

  const saveByPreferences = async () => {
    try {
      await setPreferences('bindings', Object.fromEntries(bindings.value))
    } catch (e) {
      console.error(e)
    }
  }

  const loadByPreferences = (items?: Record<string, BindingControllerButtonPreferenceValue>) => {
    bindings.value.clear()
    _init()

    if (items && Object.keys(items).length > 0) {
      Object.keys(items).forEach((key) => {
        const binding = normalizeBindingControllerButton(items[key])

        if (!setBinding(key, binding)) {
          if (binding.type === bindingControllerButtonTypes.PINNED_GROUP) {
            setBinding(key, createPinnedGroupBindingControllerButton())
          } else {
            setBinding(key, createStandardBindingControllerButton())
          }
        }
      })
    }
  }

  const _init = () => {
    const modules = [...new Set(devicesStore.gooseDevices.map(goose => goose.module?.match(/(L|R)\d+/)?.[0] || null).filter(Boolean))]
    modules.forEach((module) => {
      const name = `${GOOSE}_${module}`
      const BUTTONS_KEYS = gooseButtons.transformValues(name)
      const BUTTONS_VALUES = gooseButtons.getValues(name)
      BUTTONS_VALUES.forEach((button) => {
        if (button !== BUTTONS_KEYS.KEY_SPEAK && !bindings.value.has(button)) {
          bindings.value.set(button, createStandardBindingControllerButton())
        }
      })
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getGooseButtonByPServed = (targetPServed: PServed): string | null => {
    for (const [key, value] of bindingContacts.value) {
      if (value === targetPServed) {
        return key // Возвращаем найденный ключ
      }
    }
    return null // Возвращаем null, если ничего не найдено
  }

  const paintButton = (payload: { target: string, color: GooseButtonVisualState['color'], freq?: number }) => {
    paintGooseButton({
      target: payload.target,
      color: payload.color,
      freq: payload.freq ?? 0,
    })
  }

  const getStandardBindingVisualState = (pServed: PServed | null): GooseButtonVisualState => {
    if (!pServed) {
      return { color: 'black' as const, freq: 0 }
    }

    const firstPinnedCall = pinnedCallsStore.getFirstPinnedCallByPServed(pServed)
    const session = firstPinnedCall
      ? pinnedCallsStore.getSessionForPinnedCall(firstPinnedCall)
      : sessionStore.getPreferredSessionByPServed(pServed)

    if (session) {
      switch (session.sessionState.value) {
      case STATE.PROGRESS:
      case STATE.RINGING:
        return { color: 'green' as const, freq: 1 }
      case STATE.ONHOLD:
        return { color: 'orange' as const, freq: 0 }
      case STATE.CONNECTED: {
        const isMicEnabled = firstPinnedCall
          ? pinnedCallsStore.isPinnedCallMicEffective(pServed)
          : !session.isMuted.value

        return { color: isMicEnabled ? 'red' : 'green', freq: 0 }
      }
      default:
        return { color: 'black' as const, freq: 0 }
      }
    }

    const internalNumber = contactPServedToNumber(pServed)
    const status = contactStatusStore.contactStatuses[internalNumber]
    const isIncoming = status?.remote === CallStatusState.EARLY
      && Boolean(status.fromNumber)
      && Boolean(status.callId)
      && status.fromNumber !== appStore.currentUser?.internalNumber

    if (isIncoming) {
      return { color: 'green' as const, freq: 1 }
    }

    return { color: 'black' as const, freq: 0 }
  }

  const getPinnedGroupBindingVisualState = (groupIndex: number | null): GooseButtonVisualState => {
    if (groupIndex === null) {
      return { color: 'black' as const, freq: 0 }
    }

    const group = groupContactsStore.getGroupByIdx(groupIndex)
    if (!group) {
      return { color: 'black' as const, freq: 0 }
    }

    return { color: group.micState ? 'red' : 'green', freq: 0 }
  }

  const paintGooseButtons = (status?: SubscriberStatus) => {
    bindings.value.forEach((binding, buttonName) => {
      const visualState = binding.type === bindingControllerButtonTypes.PINNED_GROUP
        ? getPinnedGroupBindingVisualState(binding.groupIndex)
        : getStandardBindingVisualState(binding.pServed)

      paintButton({
        target: buttonName,
        color: visualState.color,
        freq: visualState.freq,
      })
    })
    void status
  }

  const getBindingContactsByModule = (fullModule: string) => {
    const result: Array<{
      button: string
      pServed: PServed | null
      type: BindingControllerButtonType
      groupIndex: number | null
    }> = []
    if (!fullModule) { // Если в commandExecHandler не придут modules по какой-то причине
      for (const [button, binding] of bindings.value) {
        result.push({
          button,
          pServed: binding.type === bindingControllerButtonTypes.STANDARD ? binding.pServed : null,
          type: binding.type,
          groupIndex: binding.type === bindingControllerButtonTypes.PINNED_GROUP ? binding.groupIndex : null,
        })
      }
      return result
    }

    const moduleMatch = fullModule.match(/(L|R)\d+/)

    for (const [button, binding] of bindings.value) {
      const buttonMatch = button.match(/(L|R)\d+/)
      if (moduleMatch?.at(0) === buttonMatch?.at(0)) {
        result.push({
          button,
          pServed: binding.type === bindingControllerButtonTypes.STANDARD ? binding.pServed : null,
          type: binding.type,
          groupIndex: binding.type === bindingControllerButtonTypes.PINNED_GROUP ? binding.groupIndex : null,
        })
      }
    }
    return result
  }

  watch(
    () => devicesStore.gooseDevices.map(goose => goose.module ?? goose.id).join('|'),
    () => {
      _init()
    },
    { immediate: true },
  )

  watch(
    () => Array.from(bindings.value.entries()).map(([button, binding]) => {
      return `${button}:${binding.type}:${binding.type === bindingControllerButtonTypes.PINNED_GROUP ? binding.groupIndex ?? '' : binding.pServed ?? ''}`
    }),
    () => {
      paintGooseButtons()
    },
    { immediate: true },
  )

  watch(
    () => Array.from(groupContactsStore.groupContacts.entries()).map(([groupIdx, group]) => {
      return `${groupIdx}:${group.micState}:${group.volumeState}:${group.members.map(member => `${member.pServed}:${member.slotIndex}`).join('|')}`
    }),
    () => {
      paintGooseButtons()
    },
  )

  watch(
    () => Array.from(pinnedCallsStore.pinnedCalls.values()).map((pin) => {
      if (!pin) {
        return 'empty'
      }

      return `${pin.pServed}:${pin.micState}:${pin.prevMicState}:${pin.order}`
    }),
    () => {
      paintGooseButtons()
    },
  )

  watch(
    () => Array.from(sessionStore.sessions.value.values()).map((session) => {
      return `${session.pServed}:${session.sessionState?.value ?? ''}:${session.isMuted?.value ?? ''}:${session.currentDevice?.value?.id ?? ''}`
    }),
    () => {
      paintGooseButtons()
    },
  )

  watch(
    () => Object.values(contactStatusStore.contactStatuses).map((status) => {
      return `${status.internalNumber}:${status.remote ?? ''}:${status.local ?? ''}:${status.fromNumber ?? ''}:${status.callId ?? ''}`
    }),
    () => {
      paintGooseButtons()
    },
  )

  return {
    bindings: readonly(bindings),
    bindingContacts: readonly(bindingContacts),
    clearBinding,
    getBinding,
    getBindingContactsByModule,
    hasPinnedGroupBinding,
    loadByPreferences,
    save: saveByPreferences,
    setBindingType,
    setContact,
    setPinnedGroup,
    paintGooseButtons,
    $reset: () => {
      bindings.value.clear()
    },
  }
})
