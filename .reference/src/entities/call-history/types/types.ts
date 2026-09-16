import {
  HistoryMessageItem,
  MessageCallAppointmentEnd,
  MessageCallAppointmentStart,
  MessageCallAnswered,
  MessageCallEnded,
  MessageCallBusy,
  MessageCallTerminated,
  CallPastMessage,
  MessageCallFailed,
  MessageCallReceivedType,
  MessageCallRecordCompleted,
} from '@wui/im'

type CallEvents =
    MessageCallAppointmentStart |
    MessageCallAppointmentEnd |
    MessageCallAnswered |
    MessageCallEnded |
    MessageCallBusy |
    MessageCallTerminated |
    CallPastMessage |
    MessageCallFailed |
    MessageCallRecordCompleted

export type DirectionCall = 'outgoing' | 'incoming' | 'missed'

export type CallHistoryReceived = MessageCallReceivedType

export type CallHistoryItem = HistoryMessageItem<CallEvents>
