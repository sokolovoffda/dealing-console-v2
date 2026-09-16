import JsSIP from '@wui/jssip'

import { SubscriberStatus, CallStatusState } from '@/entities/contact'

const domParser = new DOMParser()

export function notifyBodyParser (body: string): SubscriberStatus {
  const DOM = domParser.parseFromString(body.replace('application/dialog-info+xml', ''), 'application/xml')
  const PRESENSE: Element | undefined = DOM.getElementsByTagName('presence')[0]
  const ALERTING: Element | undefined = DOM.getElementsByTagName('ce:alerting')[0]
  const ACTIVITIES: Element | undefined = DOM.getElementsByTagName('e:activities')[0]
  const ON_THE_PHONE: Element | undefined = ACTIVITIES.getElementsByTagName('e:on-the-phone')[0]
  const TERMINATED: Element | undefined = ACTIVITIES.getElementsByTagName('ce:terminated')[0]
  const STATUS: Element | undefined = DOM.getElementsByTagName('status')[0]

  const imLogin = PRESENSE?.getAttribute('entity')
  const alertingNumberURIString = ALERTING?.getAttribute('identity')
  const alertingCallId = ALERTING?.getAttribute('call-id')
  const confirmedCallId = ON_THE_PHONE?.getAttribute('call-id')
  const terminatedCallId = TERMINATED?.getAttribute('call-id')
  const direction = ON_THE_PHONE?.getAttribute('direction') //  'recipient' | 'initiator' | null
  const callId = alertingCallId ?? confirmedCallId ?? terminatedCallId ?? undefined
  const registered = STATUS?.textContent === 'open'
  const onThePhoneNumberURIString = ON_THE_PHONE?.getAttribute('identity')

  if (!imLogin) throw new Error('no imLogin at notify')

  const internalNumber = JsSIP.URI.parse(imLogin)?.user

  if (!internalNumber) throw new Error('no internalNumber at notify')

  let remote: CallStatusState = CallStatusState.UNKNOWN
  if (registered) {
    if (alertingCallId) {
      remote = CallStatusState.EARLY
    } else if (confirmedCallId) {
      remote = CallStatusState.CONFIRMED
    } else if (terminatedCallId) {
      remote = CallStatusState.TERMINATED
    }
  }

  let targetNumber: string | undefined
  let fromNumber: string | undefined

  if (onThePhoneNumberURIString) {
    if(direction === 'recipient') { // входящий
      fromNumber = JsSIP.URI.parse(onThePhoneNumberURIString)?.user
    } else {
      targetNumber = JsSIP.URI.parse(onThePhoneNumberURIString)?.user
    }
  }

  if (alertingNumberURIString) {
    fromNumber = JsSIP.URI.parse(alertingNumberURIString)?.user
  }

  return {
    callId,
    fromNumber,
    targetNumber,
    internalNumber,
    registered,
    remote,
  }
}
