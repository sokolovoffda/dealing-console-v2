import { computed, shallowRef, triggerRef, watch, type Ref } from 'vue'

import type { Contact } from '@/entities/contact'
import {
  FAST_DIAL_GRID_SIZE,
  isValidFastDialCellIndex,
  type FastDialContactPosition,
  type FastDialGroup,
} from '@/entities/fast-dial'

export const QUICK_CALL_GRID_CELL_COUNT = FAST_DIAL_GRID_SIZE

export type QuickCallGridCell = {
  index: number
  key: string
  contactGuid: string | null
  contact: Contact | null
  type: 'contact' | 'empty'
}

export type QuickCallGridLayout = Array<string | null>

type UseQuickCallFastDialGridParams = {
  groupGuid: Ref<string | undefined>
  contacts: Ref<Contact[]>
  fastDialGroup: Ref<FastDialGroup | undefined>
}

const getContactGridGuid = (contact: Contact) => {
  return contact.guid || contact.id
}

const getUniqueContactGuids = (contacts: Contact[]) => {
  return Array.from(new Set(contacts.map(getContactGridGuid)))
}

const getContactByGuid = (contacts: Contact[]) => {
  return new Map(contacts.map(contact => [getContactGridGuid(contact), contact]))
}

const createEmptyLayout = (): QuickCallGridLayout => {
  return Array.from({ length: QUICK_CALL_GRID_CELL_COUNT }, () => null)
}

const addContactToFirstEmptyCell = (layout: QuickCallGridLayout, contactGuid: string) => {
  const emptyCellIndex = layout.findIndex(cellContactGuid => cellContactGuid === null)

  if (emptyCellIndex >= 0) {
    layout[emptyCellIndex] = contactGuid
  }
}

export const normalizeQuickCallFastDialLayout = (
  layout: QuickCallGridLayout,
  contacts: Contact[],
): QuickCallGridLayout => {
  const contactGuids = getUniqueContactGuids(contacts)
  const knownContactGuids = new Set(contactGuids)
  const usedContactGuids = new Set<string>()
  const normalizedLayout = createEmptyLayout()

  layout.slice(0, QUICK_CALL_GRID_CELL_COUNT).forEach((contactGuid, cellIndex) => {
    if (!contactGuid) return
    if (!knownContactGuids.has(contactGuid)) return
    if (usedContactGuids.has(contactGuid)) return

    normalizedLayout[cellIndex] = contactGuid
    usedContactGuids.add(contactGuid)
  })

  contactGuids.forEach((contactGuid) => {
    if (usedContactGuids.has(contactGuid)) return

    addContactToFirstEmptyCell(normalizedLayout, contactGuid)
  })

  return normalizedLayout
}

export const buildQuickCallFastDialLayout = (
  fastDialGroup: FastDialGroup | undefined,
  contacts: Contact[],
): QuickCallGridLayout => {
  const layout = createEmptyLayout()

  fastDialGroup?.contacts.forEach(({ contactGuid, cellIndex }) => {
    if (!isValidFastDialCellIndex(cellIndex)) return
    if (layout[cellIndex] !== null) return

    layout[cellIndex] = contactGuid
  })

  return normalizeQuickCallFastDialLayout(layout, contacts)
}

export const buildQuickCallFastDialGridCells = (
  layout: QuickCallGridLayout,
  contacts: Contact[],
): QuickCallGridCell[] => {
  const contactsByGuid = getContactByGuid(contacts)

  return layout.map((contactGuid, index) => {
    const contact = contactGuid ? contactsByGuid.get(contactGuid) ?? null : null

    if (!contact) {
      return {
        index,
        key: `empty-${index}`,
        contactGuid: null,
        contact: null,
        type: 'empty',
      }
    }

    return {
      index,
      key: `contact-${getContactGridGuid(contact)}`,
      contactGuid: getContactGridGuid(contact),
      contact,
      type: 'contact',
    }
  })
}

export const moveContactInQuickCallFastDialLayout = (
  layout: QuickCallGridLayout,
  contacts: Contact[],
  contactGuid: string,
  cellIndex: number,
): QuickCallGridLayout | null => {
  if (!isValidFastDialCellIndex(cellIndex)) return null

  const currentLayout = [...normalizeQuickCallFastDialLayout(layout, contacts)]
  const currentContactGuids = new Set(getUniqueContactGuids(contacts))
  if (!currentContactGuids.has(contactGuid)) return null

  const sourceIndex = currentLayout.findIndex(currentCellContactGuid => currentCellContactGuid === contactGuid)
  const targetContactGuid = currentLayout[cellIndex] ?? null

  if (sourceIndex >= 0 && sourceIndex !== cellIndex) {
    currentLayout[sourceIndex] = targetContactGuid
  }

  currentLayout[cellIndex] = contactGuid

  return normalizeQuickCallFastDialLayout(currentLayout, contacts)
}

export const removeContactFromQuickCallFastDialLayout = (
  layout: QuickCallGridLayout,
  contacts: Contact[],
  contactGuid: string,
): QuickCallGridLayout => {
  const nextLayout = layout.map((currentContactGuid) => {
    return currentContactGuid === contactGuid ? null : currentContactGuid
  })

  return normalizeQuickCallFastDialLayout(nextLayout, contacts)
}

export const toQuickCallFastDialContactPositions = (
  layout: QuickCallGridLayout,
): FastDialContactPosition[] => {
  return layout.flatMap((contactGuid, cellIndex) => {
    if (!contactGuid) return []

    return [{
      contactGuid,
      cellIndex,
    }]
  })
}

export const useQuickCallFastDialGrid = ({
  groupGuid,
  contacts,
  fastDialGroup,
}: UseQuickCallFastDialGridParams) => {
  const localLayoutsByGroupGuid = shallowRef(new Map<string, QuickCallGridLayout>())

  const setGroupLocalLayout = (guid: string, layout: QuickCallGridLayout) => {
    localLayoutsByGroupGuid.value.set(guid, layout)
    triggerRef(localLayoutsByGroupGuid)
  }

  const clearGroupLocalLayout = (guid: string) => {
    if (!localLayoutsByGroupGuid.value.has(guid)) return

    localLayoutsByGroupGuid.value.delete(guid)
    triggerRef(localLayoutsByGroupGuid)
  }

  const setLocalLayout = (nextLayout: QuickCallGridLayout) => {
    const guid = groupGuid.value
    if (!guid) return

    setGroupLocalLayout(guid, normalizeQuickCallFastDialLayout(nextLayout, contacts.value))
  }

  const setLocalGroupLayout = (guid: string, nextLayout: QuickCallGridLayout, groupContacts: Contact[]) => {
    setGroupLocalLayout(guid, normalizeQuickCallFastDialLayout(nextLayout, groupContacts))
  }

  const getGroupLayout = (
    guid: string,
    groupContacts: Contact[],
    groupFastDial: FastDialGroup | undefined,
  ) => {
    const localLayout = localLayoutsByGroupGuid.value.get(guid)

    if (localLayout) {
      return normalizeQuickCallFastDialLayout(localLayout, groupContacts)
    }

    return buildQuickCallFastDialLayout(groupFastDial, groupContacts)
  }

  const baseLayout = computed(() => {
    return buildQuickCallFastDialLayout(fastDialGroup.value, contacts.value)
  })

  const layout = computed(() => {
    const guid = groupGuid.value

    if (!guid) return buildQuickCallFastDialLayout(undefined, [])

    const localLayout = localLayoutsByGroupGuid.value.get(guid)
    if (localLayout) {
      // Не трогаем sparse-layout, пока контакты группы ещё не подгрузились.
      if (contacts.value.length === 0) {
        return localLayout
      }

      return normalizeQuickCallFastDialLayout(localLayout, contacts.value)
    }

    return baseLayout.value
  })

  const cells = computed(() => buildQuickCallFastDialGridCells(layout.value, contacts.value))

  const syncLocalLayout = () => {
    const guid = groupGuid.value
    if (!guid) return

    const localLayout = localLayoutsByGroupGuid.value.get(guid)
    if (!localLayout) return

    // Пока контакты группы ещё не загружены, normalize упакует layout в пустой
    // и при следующей подгрузке разложит всех в первые ячейки подряд.
    if (contacts.value.length === 0) return

    setGroupLocalLayout(guid, normalizeQuickCallFastDialLayout(localLayout, contacts.value))
  }

  // При смене таба локальный overlay сбрасываем: источник правды — fast-dial store.
  // Иначе после действия + переключения таба может остаться повреждённый local layout.
  watch(groupGuid, (guid, previousGuid) => {
    if (previousGuid) {
      clearGroupLocalLayout(previousGuid)
    }

    if (guid) {
      clearGroupLocalLayout(guid)
    }
  })

  watch([groupGuid, contacts], syncLocalLayout)

  const moveContactToCell = (contactGuid: string, cellIndex: number) => {
    const guid = groupGuid.value
    if (!guid) return

    const nextLayout = moveContactInQuickCallFastDialLayout(layout.value, contacts.value, contactGuid, cellIndex)
    if (!nextLayout) return

    setGroupLocalLayout(guid, nextLayout)
  }

  return {
    cells,
    clearGroupLocalLayout,
    getGroupLayout,
    layout,
    localLayoutsByGroupGuid,
    moveContactToCell,
    setLocalGroupLayout,
    setLocalLayout,
  }
}
