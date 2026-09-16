import type { PinnedCallGroupMember } from '@/entities/pinned-calls'

export type AddBroadcastGroupMembersOption = {
  order: number
  title: string
  pServed: string
  slotIndex: number
}

export type AddBroadcastGroupMembersModalResult = {
  members: PinnedCallGroupMember[]
}
