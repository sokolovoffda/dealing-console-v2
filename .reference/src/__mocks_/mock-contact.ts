import { Contact } from '@/entities/contact'

import { PSTNGUEST } from '@/shared/utils/contact'

export const mockContact: Contact = {
  groupIds: [
    '87e9e556-34de-463c-8c94-e161bea19aad',
    'd59bc701-90b4-4fc0-9da2-acf68b738933',
  ],
  id: '4fc6c6613xcxcv0e14bc29bda8763a8d45b71',
  name: 'Супергерой',
  internalNumber: '3450',
  organization: 'САТЕЛ ПРО',
  organizationalUnit: 'Лучший отдел',
  position: 'Разработчик',
  mobilePhone: undefined,
  email: '',
  imLogin: '<sip:3450@ROOT>',
  isFavorite: true,
  isOnline: false,
  lastSeen: 1657790050,
  terminalLogin: 'terminalLogin',
  terminalPassword: 'terminalPassword',
  groups: [],
  pServed: 'pServed',
}

export const mockContact3450: Contact = {
  groupIds: [
    '87e9e556-34de-463c-8c94-e161bea19aad',
    'd59bc701-90b4-4fc0-9da2-acf68b738933',
  ],
  id: '4fc6c66130e14bc29bda87xcvxcv63asdfs8d45b71',
  name: 'Супергерой',
  internalNumber: '3450',
  organization: 'САТЕЛ ПРО',
  organizationalUnit: undefined,
  position: undefined,
  mobilePhone: undefined,
  email: '',
  imLogin: '<sip:3450@ROOT>',
  isFavorite: true,
  isOnline: false,
  lastSeen: 1657790050,
  terminalLogin: 'terminalLogin',
  terminalPassword: 'terminalPassword',
  groups: [],
  pServed: 'pServed',
}

export const mockContact4498: Contact = {
  groupIds: [
    '87e9e556-34de-463c-8c94-e161bea19aad',
    'd59bc701-90b4-4fc0-9da2-acf68b738933',
  ],
  id: '4fc6c66130e14basdasdc29bda8763a8d12312345b71',
  name: 'Дмитрий Бикеев',
  internalNumber: '4498',
  organization: 'САТЕЛ ПРО',
  organizationalUnit: undefined,
  position: 'Разработчик',
  mobilePhone: '89999999999',
  email: '',
  imLogin: '<sip:4498@ROOT>',
  isFavorite: true,
  isOnline: false,
  lastSeen: 165779005021,
  terminalLogin: 'terminalLogin',
  terminalPassword: 'terminalPassword',
  groups: [],
  pServed: 'pServed',
}

export const mockContact4495: Contact = {
  groupIds: [
    '87e9e556-34de-463c-8c94-e161bea19aad',
    'd59bc701-90b4-4fc0-9da2-acf68b738933',
  ],
  id: '4fcxcvcxv6c66130e14bc29bda8763a8d45b71',
  name: 'Пол Атрейдес',
  internalNumber: '4495',
  organization: 'САТЕЛ ПРО',
  organizationalUnit: undefined,
  position: 'Разработчик',
  mobilePhone: undefined,
  email: 'pol@satel.ru',
  imLogin: '<sip:4495@ROOT>',
  isFavorite: true,
  isOnline: true,
  lastSeen: 1657790050,
  terminalLogin: 'terminalLogin',
  terminalPassword: 'terminalPassword',
  groups: [
    {
      guid: 'one',
      name: 'Группа 1',
    }, {
      guid: 'two',
      name: 'Группа 2',
    }, {
      guid: 'three',
      name: 'Группа 3',
    },
  ],
  pServed: 'pServed',
}

export const mockPSTNGuest: Contact = {
  groupIds: [
    '87e9e556-34de-463c-8c94-e161bea19aad',
    'd59bc701-90b4-4fc0-9da2-acf68b738933',
  ],
  id: '4fc6cgewres66130e14bc29bda8763a8d45b71',
  name: 'Супергерой',
  internalNumber: `${PSTNGUEST}-${3450}`,
  organization: 'САТЕЛ ПРО',
  organizationalUnit: undefined,
  position: undefined,
  mobilePhone: undefined,
  email: '',
  imLogin: '<sip:3450@ROOT>',
  isFavorite: true,
  isOnline: false,
  lastSeen: 1657790050,
  terminalLogin: 'terminalLogin',
  terminalPassword: 'terminalPassword',
  groups: [],
  pServed: 'pServed',
}

export const mockCurrentUser = {
  id: 'id2',
  name: 'name2',
  internalNumber: '44982',
  groupIds: ['12312sadfsdf23', '1resagfe351134', 'zdxfrw1qfds98sdf98sd5'],
  organization: '',
  position: '',
  imLogin: 'imLogin2',
  terminalLogin: '',
  terminalPassword: '',
}


