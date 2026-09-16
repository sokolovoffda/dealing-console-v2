import { PermanentSchedule, ScheduleItem } from '@wui/common-library'

export enum ForwardingConditions {
  ALL = 'all',
  UNCONDITIONAL = 'unconditional',
  NO_ANSWER = 'noAnswer',
  UNREACHABLE = 'unreachable',
  BUSY = 'busy',
}

export enum SubscriberServices {
  DoNotDisturb = 'Не беспокоить',
  Forward = 'Переадресация',
  BlackWhiteList = 'Черные/белые списки',
  VoiceMailForwarding = 'Голосовая почта',
  FollowMe = 'Следуй за мной',
  IVR = 'IVR',
}

export enum Events {
  SAVE_CLICKED = 'saveClicked'
}

export interface Condition {
  label: string
  value: ForwardingConditions
  default?: boolean
}

export interface Scenario {
  key: string | null
  value: string | null
}

export interface Service {
  key: string
  value: string
  default?: boolean
}

export interface IPrioritable {
  priority: number
}

export interface Forwarding extends IPrioritable {
  aNumber: string
  condition: ForwardingConditions
  enabled: boolean
  forwardNumber: string
  guid: string
  isDefault?: boolean
  scenario: Scenario
  schedule: {
    permanentSchedule: PermanentSchedule,
    specialScheduleItems: ScheduleItem[]
  }
  service: Service
  timeout?: string
}

export interface SubscriberService {
  [key: string]: SubscriberServices
}

export interface ScenarioValue {
  [key: string]: string
}
export interface Scenarios {
  [key: string]: ScenarioValue
}

export type TerminalDeviceType = 'misconfigured' | 'phone' | 'softPhone' | 'external' | 'combined'

export type TerminalStatus = 'noControl' | 'connected' | 'notConnected'
export interface Terminal {
  guid: string,
  id: number,
  loginForDisplay: string,
  description: string,
  macAddress: string,
  deviceName: string,
  deviceType: TerminalDeviceType,
  status: TerminalStatus,
  ipAddress: string,
  externalPhoneNumber: string,
  isRtuClient: boolean,
  isWebClient: boolean
}

export enum FeaturesNames {
  DEFAULT = 'default',
  INSTANT_MESSAGING = 'InstantMessaging',
  CLIR = 'CLIR',
  HOLD = 'Hold',
  TRANSFER = 'Transfer',
  FORWARD = 'Forward',
  CONFERENCE = 'Conference',
  CALL_INTRUSION = 'CallIntrusion',
  CALL_WAITING = 'CallWaiting',
  MPTY_CONFERENCE = 'MptyConference',
  BLF = 'Blf',
  ALARM = 'Alarm',
  SPEED_DIAL = 'SpeedDial',
  CLIP = 'CLIP',
  WEB_CALL_BACKORDER = 'WebCallbackOrder',
  WEB_TO_FAX = 'WebToFax',
  DO_NOT_DISTURB = 'DoNotDisturb',
  BLACK_WHITE_LIST = 'BlackWhiteList',
  VOICE_MAILBOX_ACCESS = 'VoiceMailBoxAccess',
  VOICEMAIL_FORWARDING = 'VoiceMailForwarding',
  FOLLOW_ME = 'FollowMe',
  IVR = 'IVR',
  MULTI_TERMINAL = 'MultiTerminal',
  AUTO_DIAL = 'AutoDial',
  SAVE_PROMPT = 'SavePrompt',
  REDIAL = 'Redial',
  QUERY_SERVICE_LIST = 'QueryServiceList',
  QUERY_ALARM = 'QueryAlarm',
  QUERY_FWD = 'QueryFwd',
  QUERY_SPEED_DIAL = 'QuerySpeedDial',
  SUBSCRIBER_PICKUP = 'SubscriberPickUp',
  SUBSCRIBER_AUTO_DIAL_CALLBACK = 'SubscriberAutoDialCallBack',
  MISSED_CALL_NOTIFICATION = 'MissedCallNotification',
  FMC = 'FMC',
  ACCESS_GROUP_MANAGEMENT = 'AccessGroupManagement',
  AUDIO_FILES_MANAGEMENT = 'AudiofilesManagement',
  CALLBACK_ORDER = 'CallbackOrder',
  CHATROOM = 'ChatRoom',
  CALL_PARK = 'CallPark',
  VIRTUAL_FAX = 'VirtualFax',
  PERSONAL_WEB_CABINET_ACCESS = 'PersonalWebCabinetAccess',
  WEBCLIENT_FILES = 'WebClientFiles',
  SET_DND = 'SetDND'
}

export interface RuleRowModel {
  model: Forwarding, valid: boolean
}

export type PriorityDirections = 'up' | 'down'
