import { ContactState } from '@wui/im'
import { storeToRefs } from 'pinia'
import { Ref, shallowRef, triggerRef } from 'vue'


import { useAppStore } from '@/shared/composables'
import { contactPServedToNumber } from '@/shared/services'

import { resolveContactAudioMuted } from '../lib/resolve-contact-audio-muted'

export enum MemberStatus {
  Inactive = 'Inactive',
  Dialing = 'Dialing',
  Active = 'Active',
  OnHold = 'OnHold',
}
export interface MemberStatuses {
  [number: string]: MemberStatus
}
export interface MemberMediaStatuses {
  [number: string]: MemberMediaStatus
}

const memberStatusByNumber: {
  [key: number]: MemberStatus
} = {
  0: MemberStatus.Inactive,
  1: MemberStatus.Dialing,
  2: MemberStatus.Active,
  3: MemberStatus.OnHold,
}

export interface MemberMediaStatus {
  handEnabled: boolean
  mutedMyAudio: boolean
  mutedMyVideo: boolean
  mutedOtherAudio: boolean
  mutedOtherVideo: boolean
}

export interface RoomStatus {
  active: boolean
  statuses: MemberStatuses
  mediaStatuses: MemberMediaStatuses
}
function toMemberStatuses (contacts: ContactState[] | undefined): [MemberStatuses, MemberMediaStatuses] {
  const result: [MemberStatuses, MemberMediaStatuses] = [
    {} as MemberStatuses,
    {} as MemberMediaStatuses,
  ]
  if (!contacts?.length) return result

  contacts.forEach(contact => {
    const number = contactPServedToNumber(contact.id)
    if(!number) return
    result[0][number] = memberStatusByNumber[contact.state]
    result[1][number] = {
      handEnabled: contact.handEnabled || false,
      // mutedMyAudio deprecated — берём mute из streams
      mutedMyAudio: resolveContactAudioMuted(contact),
      mutedMyVideo: contact.mutedMyVideo || false,
      mutedOtherAudio: contact.mutedOtherAudio || false,
      mutedOtherVideo: contact.mutedOtherVideo || false,
    }
  })

  return result
}

const roomStatuses: Ref<{ [pServedConf: string]: RoomStatus }> = shallowRef({})

export default () => {
  const updateRoomMemberStatuses = (
    pServedConf: string,
    contactStates: ContactState[],
  ): void => {
    const [statuses, mediaStatuses] = toMemberStatuses(contactStates)
    const active = !!Object.values(statuses).find((status) => status !== MemberStatus.Inactive)?.length
    roomStatuses.value[pServedConf] = {
      active,
      statuses,
      mediaStatuses,
    }
    triggerRef(roomStatuses)
  }

  const getRoomStatus = (pServedConf: string): RoomStatus => {
    return roomStatuses.value[pServedConf]
  }

  const getCurrentUserStatus = (pServedConf: string): MemberStatus => {
    const { currentUser } = storeToRefs(useAppStore())
    if (!currentUser.value) return MemberStatus.Inactive
    return getMemberStatus(pServedConf, currentUser.value.internalNumber)
  }

  const getMemberStatus = (pServedConf: string, memberNumber?: string): MemberStatus => {
    if (!memberNumber) return MemberStatus.Inactive
    // console.debug('getMemberStatus', pServedConf, memberNumber, roomStatuses.value[pServedConf]?.statuses[memberNumber])
    return (roomStatuses.value[pServedConf]?.statuses[memberNumber] || MemberStatus.Inactive)
  }

  const getMemberMediaStatus = (pServedConf: string, memberNumber?: string) => {
    if (!memberNumber) return undefined
    return roomStatuses.value[pServedConf]?.mediaStatuses[memberNumber]
  }

  // Optimistic UI до следующего GroupStatus
  const setMemberAudioMuted = (
    pServedConf: string,
    memberNumber: string,
    muted: boolean,
  ): void => {
    const emptyMedia: MemberMediaStatus = {
      handEnabled: false,
      mutedMyAudio: muted,
      mutedMyVideo: false,
      mutedOtherAudio: false,
      mutedOtherVideo: false,
    }
    const room = roomStatuses.value[pServedConf]

    if (!room) {
      roomStatuses.value[pServedConf] = {
        active: true,
        statuses: {},
        mediaStatuses: {
          [memberNumber]: emptyMedia,
        },
      }
    } else {
      const prev = room.mediaStatuses[memberNumber]
      room.mediaStatuses[memberNumber] = prev
        ? { ...prev, mutedMyAudio: muted }
        : emptyMedia
    }
    triggerRef(roomStatuses)
  }

  const getStatuses = (): Ref<{ [pServedConf: string]: RoomStatus }> => {
    return roomStatuses
  }

  return {
    updateRoomMemberStatuses,
    setMemberAudioMuted,
    getRoomStatus,
    getMemberStatus,
    getMemberMediaStatus,
    getCurrentUserStatus,
    getStatuses,
  }
}
