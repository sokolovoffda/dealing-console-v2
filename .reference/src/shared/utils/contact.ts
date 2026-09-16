import { PServed } from '@wui/im'

import { useConferenceSubscriberStatusState, ConferenceContact } from '@/entities/conference'
import { useContactStore, Contact, useContactCachedStore } from '@/entities/contact'

import { contactPServedToNumber } from '../services/uri-helper'

export const PSTNGUEST = 'PSTNGUEST'
const EXTERNAL_CONTACT_LABEL = '\u0412\u043d\u0435\u0448\u043d\u0438\u0439 \u043a\u043e\u043d\u0442\u0430\u043a\u0442'

// TODO перенести в утилиты конференций, если вообще есть нужда в ф-ии
export const removePSTNGUESTFromString = (str: string) => {
  return str.replace(`${PSTNGUEST}-`, '')
}

export const createExternalContact = (internalNumber: string, saveToIndexedDB = true): Contact => {
  const contact: Contact = {
    pServed: `<sip:${internalNumber}@ROOT>`,
    internalNumber: internalNumber,
    name: `${internalNumber} (${EXTERNAL_CONTACT_LABEL})`,
    organization: '',
    organizationalUnit: EXTERNAL_CONTACT_LABEL,
    groupIds: [],
    id: internalNumber,
    imLogin: '',
    terminalLogin: '',
    terminalPassword: '',
    isExternal: true,
    groups: [],
  }
  if (saveToIndexedDB) {
    const { saveExternalContactToIndexedDb } = useContactStore()
    saveExternalContactToIndexedDb(contact).catch((e) => console.error(e))
  }
  return contact
}

export const createFallbackContact = (internalNumber: string): Contact => {
  return {
    pServed: `<sip:${internalNumber}@ROOT>`,
    internalNumber,
    name: internalNumber,
    organization: '',
    organizationalUnit: '',
    groupIds: [],
    id: internalNumber,
    imLogin: '',
    terminalLogin: '',
    terminalPassword: '',
    isExternal: false,
    groups: [],
  }
}

export const toConferenceContact = (pServedConf: string, pServed: PServed): ConferenceContact => {
  const { getLocalByPServed } = useContactCachedStore()
  const { getMemberStatus } = useConferenceSubscriberStatusState()
  const contact = getLocalByPServed(pServed) ?? createExternalContact(contactPServedToNumber(pServed), false)
  const isExternalContact = 'isExternal' in contact && contact.isExternal
  return {
    ...contact, // Contact or UserInfo
    internalNumber: isExternalContact ? 'PSTNGUEST-' + contact.internalNumber : contact.internalNumber,
    pServed: 'pServed' in contact ? contact.pServed : pServed, // если это UserInfo, добавляем pServed, чтоб подогнать под Contact
    status: getMemberStatus(pServedConf, contact.internalNumber),
  }
}
