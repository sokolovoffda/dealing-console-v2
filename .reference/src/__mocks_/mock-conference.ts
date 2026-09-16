import { mockContact3450, mockContact4495, mockContact4498 } from '@/__mocks_/mock-contact'

import { ConferenceDto, RoomMemberRole, SubscriberDto } from '@/entities/conference'
import { Contact } from '@/entities/contact'

import { contactNumberToPServed } from '@/shared/services'

const transfer = (contact: Contact): SubscriberDto => ({
  pServed: contactNumberToPServed(contact.internalNumber),
  name: contact.name,
  phoneNumber: contact.internalNumber,
  email: contact.email ?? '',
  guid: contact.id,
  type: 'member',
  role: RoomMemberRole.User,
})

export const mockConference: ConferenceDto = {
  pServed:'Conference-P-Served',
  name: 'Конференция',
  selectorMode: '9999',
  capacity: 0,
  subscribers: [transfer(mockContact4498), transfer(mockContact3450), transfer(mockContact4495)],
  domainPath: '@ROOT',
}
