import { PServed } from '@wui/im'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import { usePinnedCallsStore } from '@/entities/call-session'
import type { PinnedCall } from '@/entities/call-session'
import { usePreferencesStore } from '@/entities/preference'

type GroupIdx = number

export interface GroupPinnedSlotMember {
  pServed: PServed
  slotIndex: number
}

export interface GroupContacts {
  micState: boolean
  volumeState: boolean
  members: GroupPinnedSlotMember[]
}

type GroupMemberTarget = GroupPinnedSlotMember | PinnedCall | PServed
type GroupContactsPreferenceItem = {
  micState: boolean
  volumeState: boolean
  members: Array<GroupPinnedSlotMember | PServed>
}

const createGroupPinnedSlotMember = (pin: Pick<PinnedCall, 'pServed' | 'slotIndex'>): GroupPinnedSlotMember => ({
  pServed: pin.pServed,
  slotIndex: pin.slotIndex ?? 1,
})

const isPinnedCall = (target: GroupMemberTarget): target is PinnedCall => {
  return typeof target !== 'string' && 'order' in target
}

const isSameGroupMember = (left: GroupPinnedSlotMember, right: GroupPinnedSlotMember): boolean => {
  return left.pServed === right.pServed && left.slotIndex === right.slotIndex
}

const normalizeGroupMember = (member: GroupPinnedSlotMember | PServed): GroupPinnedSlotMember => {
  return typeof member === 'string'
    ? { pServed: member, slotIndex: 1 }
    : { pServed: member.pServed, slotIndex: member.slotIndex ?? 1 }
}

const isTargetGroupMember = (member: GroupPinnedSlotMember, target: GroupMemberTarget): boolean => {
  if (typeof target === 'string') {
    return member.pServed === target
  }

  if (isPinnedCall(target)) {
    return isSameGroupMember(member, createGroupPinnedSlotMember(target))
  }

  return isSameGroupMember(member, normalizeGroupMember(target))
}

const createDefaultGroupContacts = () => new Map<GroupIdx, GroupContacts>([
  [0, { micState: true, volumeState: true, members: [] }],
  [1, { micState: false, volumeState: false, members: [] }],
  [2, { micState: false, volumeState: false, members: [] }],
  [3, { micState: false, volumeState: false, members: [] }],
  [4, { micState: false, volumeState: false, members: [] }],
  [5, { micState: false, volumeState: false, members: [] }],
  [6, { micState: false, volumeState: false, members: [] }],
])

export const useGroupContactsStore = defineStore('group-contacts', () => {
  const groupContacts = ref(createDefaultGroupContacts())

  const isEditMode = ref<boolean>(false)
  const resolvePinnedCallForMember = (member: GroupPinnedSlotMember): PinnedCall | undefined => {
    return usePinnedCallsStore().getPinnedCallBySlotMember(member)
  }

  const addPinnedCall = (groupIdx: GroupIdx, pin: PinnedCall) => {
    const { pServed, order } = pin
    const pinnedCall = usePinnedCallsStore().pinnedCalls.get(order)
    if(!pinnedCall) { console.warn(`Pinned call with pServed ${pServed} not found`); return }
    const member = createGroupPinnedSlotMember(pin)

    let flagExist = false
    groupContacts.value.forEach((group) => {
      if(group.members.some(groupMember => isSameGroupMember(groupMember, member))) flagExist = true // уже есть в одной из групп
    })
    if(flagExist) return

    const group = groupContacts.value.get(groupIdx)
    if(!group) { console.warn(`Group with index ${groupIdx} not found`); return }
    group.members.push(member)

    if(group.micState !== pinnedCall.micState) {
      usePinnedCallsStore().togglePinnedCallMicState({
        order,
        action: group.micState ? 'set' : 'mute-temp',
        value: group.micState,
        updatePrefs: false,
      })
    }
    if(!group.volumeState && pinnedCall.volume > 0) { // мьютим громкость, если добавляем в замьюченную группу
      usePinnedCallsStore().changePinnedCallVolume({ order, volume: 0, temp: 'mute', updatePrefs: false })
    }
    usePinnedCallsStore().savePreferencesOnServer()
    updatePreferences()
  }

  const removeContact = (groupIdx: GroupIdx, target: GroupMemberTarget) => {
    const group = groupContacts.value.get(groupIdx)
    if(!group) {
      console.warn(`Group with idx ${groupIdx} not found`)
      return
    }
    group.members = group.members.filter(member => !isTargetGroupMember(member, target))
    updatePreferences()
  }

  const findInAllGroupsAndRemove = (target: GroupMemberTarget) => {
    groupContacts.value.forEach((group) => {
      group.members = group.members.filter(member => !isTargetGroupMember(member, target))
    })
    updatePreferences()
  }

  const toggleMicForGroup = (groupIdx: GroupIdx, setState: boolean | undefined = undefined) => {
    const currentGroup = groupContacts.value.get(groupIdx)
    if(!currentGroup) { console.warn(`Group with idx ${groupIdx} not found`); return }

    const newState = setState !== undefined ? setState : !currentGroup.micState
    const tryMuteCurrentGroup = currentGroup.micState === true

    groupContacts.value.forEach((groupItem, idx) => {
      const isCurrentGroup = idx === groupIdx
      // мемберам текущей группы выставляем микрофон в newState, остальным обратное значение
      // (за исключением случаев, когда мы мьютим текущую группу, в таком случае остальные должны остаться замьюченные)
      const state = isCurrentGroup ? newState : (tryMuteCurrentGroup ? false : !newState)
      groupItem.micState = state

      groupItem.members.forEach((member) => {
        const pinnedCall = resolvePinnedCallForMember(member)
        if (!pinnedCall) {
          return
        }

        usePinnedCallsStore().togglePinnedCallMicState({
          order: pinnedCall.order,
          action: state ? 'set' : 'mute-temp',
          value: groupItem.micState,
          updatePrefs: false,
        })
      })
    })
    usePinnedCallsStore().savePreferencesOnServer()
    updatePreferences()
  }

  const toggleVolumeForGroup = (groupIdx: GroupIdx, setState: boolean | undefined = undefined) => {
    const group = groupContacts.value.get(groupIdx)
    if(!group) { console.warn(`Group with idx ${groupIdx} not found`); return }
    group.volumeState = setState ?? !group.volumeState
    group.members.forEach((member) => {
      const pinnedCall = resolvePinnedCallForMember(member)
      if (!pinnedCall) {
        return
      }

      usePinnedCallsStore().changePinnedCallVolume({
        order: pinnedCall.order,
        volume: group.volumeState ? 1 : 0,
        temp: group.volumeState ? 'unmute' : 'mute',
        updatePrefs: false,
      })
    })
    usePinnedCallsStore().savePreferencesOnServer()
    updatePreferences()
  }

  const getGroupByIdx = (idx: GroupIdx): GroupContacts | undefined => groupContacts.value.get(idx)

  const updatePreferences = () => {
    usePreferencesStore().setPreferences('pinnedCallsGroups', Object.fromEntries(groupContacts.value)).then()
  }

  const loadByPreferences = (items: Record<GroupIdx, GroupContactsPreferenceItem> | undefined) => {
    if(!items) return
    Object.keys(items).forEach((key) => {
      const item = items[+key]
      groupContacts.value.set(+key, {
        micState: item.micState,
        volumeState: item.volumeState,
        members: item.members.map(normalizeGroupMember),
      })
    })
  }

  const $reset = () => {
    groupContacts.value = createDefaultGroupContacts()
    isEditMode.value = false
  }

  return {
    groupContacts: groupContacts,
    isEditMode,
    addPinnedCall,
    removeContact,
    removeFromAllGroups: findInAllGroupsAndRemove,
    toggleMicForGroup,
    toggleVolumeForGroup,
    getGroupByIdx,
    loadByPreferences,
    $reset,
  }
})
