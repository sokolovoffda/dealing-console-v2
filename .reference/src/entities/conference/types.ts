import { ConferenceMemberRole } from '@wui/im'

import { ContactDto } from '@/entities/contact'

export interface ConferenceDto {
  name: string;
  pServed: string;
  capacity: number;
  domainPath: string;
  selectorMode: string;
  subscribers: SubscriberDto[];
  subscribersCount?: number
  isAutoRecording?: boolean,
  isRecording?: boolean,
  isPause?: boolean // Вся конференция на паузе
}

/**
 * Участник конференции
 */
export interface SubscriberDto {
  pServed: string;
  guid: string; // phone number or hash contact id or pServed
  email: string;
  name: string;
  phoneNumber: string;
  type: RoomContactType;
  role: ConferenceMemberRole;
}

export interface ConferenceContact extends ContactDto {
  status: MemberStatus
}

export type RoomContactType = 'member' | 'guest' | 'pstnGuest'

export enum RoomMemberRole {
  Owner = 'Owner',
  User = 'User',
  Moderator = 'Moderator',
  External = 'External',
}

export enum MemberStatus {
  Inactive = 'Inactive',
  Dialing = 'Dialing',
  Active = 'Active',
  OnHold = 'OnHold',
}

export enum MemberStatusNumber {
  Inactive,
  Dialing,
  Active,
  OnHold,
}

export interface ContactMediaStatuses {
  handEnabled: boolean
  isAudioMuted: boolean
}

export interface ContactIdMediaStatuses extends ContactMediaStatuses {
  id: string
}