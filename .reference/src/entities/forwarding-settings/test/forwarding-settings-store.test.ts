import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'

import { useForwardingSettingsStore } from '../model/forwarding-settings-store'

vi.mock('@/entities/forwarding-settings', () => {
  const forwardings = new Map([
    [
      'all',
      [
        {
          'guid': '8b7ffa00-2fd4-40ab-b4d2-2908bdabe29b',
          'isDefault': true,
          'condition': 'noAnswer',
          'enabled': false,
          'priority': 501,
          'service': {
            'key': 'e067cd38-46ec-11ec-bfbe-00155d6f020b',
            'value': 'Forward',
          },
          'scenario': {
            'key': null,
            'value': null,
          },
          'timeout': '30',
          'aNumber': '.*',
          'forwardNumber': '',
        },
        {
          'guid': 'ebe4ca48-8d0f-4486-990f-e87b20499ea3',
          'isDefault': false,
          'condition': 'noAnswer',
          'enabled': false,
          'priority': 300,
          'service': {
            'key': 'e067d0b6-46ec-11ec-bfbe-00155d6f020b',
            'value': 'VoiceMailForwarding',
          },
          'scenario': {
            'key': null,
            'value': null,
          },
          'timeout': '10',
          'aNumber': '^3450|44944$',
          'forwardNumber': '',
          'schedule': {
            'permanentSchedule': {
              'template': 'D71F02F055125F4D20FE42504E79DD48',
              'items': [
                {
                  'id': 'monday',
                  'isWorkingDay': true,
                  'date': 'monday',
                  'schedule': [
                    {
                      'from': '08:00',
                      'to': '17:00',
                    },
                  ],
                },
                {
                  'id': 'tuesday',
                  'isWorkingDay': true,
                  'date': 'tuesday',
                  'schedule': [
                    {
                      'from': '08:00',
                      'to': '17:00',
                    },
                  ],
                },
                {
                  'id': 'wednesday',
                  'isWorkingDay': true,
                  'date': 'wednesday',
                  'schedule': [
                    {
                      'from': '00:00',
                      'to': '23:59',
                    },
                  ],
                },
                {
                  'id': 'thursday',
                  'isWorkingDay': true,
                  'date': 'thursday',
                  'schedule': [
                    {
                      'from': '00:00',
                      'to': '23:59',
                    },
                  ],
                },
                {
                  'id': 'friday',
                  'isWorkingDay': true,
                  'date': 'friday',
                  'schedule': [
                    {
                      'from': '00:00',
                      'to': '23:59',
                    },
                  ],
                },
                {
                  'id': 'saturday',
                  'isWorkingDay': false,
                  'date': 'saturday',
                  'schedule': [
                    {
                      'from': '00:00',
                      'to': '23:59',
                    },
                  ],
                },
                {
                  'id': 'sunday',
                  'isWorkingDay': false,
                  'date': 'sunday',
                  'schedule': [
                    {
                      'from': '00:00',
                      'to': '23:59',
                    },
                  ],
                },
              ],
            },
            'specialScheduleItems': [],
          },
        },
        {
          'guid': '32b04b57-7b9e-4326-bd9e-40f1ef4e5747',
          'isDefault': true,
          'condition': 'unconditional',
          'enabled': false,
          'priority': 400,
          'service': {
            'key': 'e067cd38-46ec-11ec-bfbe-00155d6f020b',
            'value': 'Forward',
          },
          'scenario': {
            'key': null,
            'value': null,
          },
          'timeout': '',
          'aNumber': '.*',
          'forwardNumber': '',
        },
        {
          'guid': 'cc47739a-91e1-45d5-baf9-ad8ba822792b',
          'isDefault': true,
          'condition': 'unconditional',
          'enabled': false,
          'priority': 200,
          'service': {
            'key': 'e067cfed-46ec-11ec-bfbe-00155d6f020b',
            'value': 'DoNotDisturb',
          },
          'scenario': {
            'key': null,
            'value': null,
          },
          'timeout': '',
          'aNumber': '.*',
          'forwardNumber': '',
        },
        {
          'guid': '93b15ef2-f383-44f7-b7e2-e5aceed5b159',
          'isDefault': true,
          'condition': 'busy',
          'enabled': false,
          'priority': 502,
          'service': {
            'key': 'e067cd38-46ec-11ec-bfbe-00155d6f020b',
            'value': 'Forward',
          },
          'scenario': {
            'key': null,
            'value': null,
          },
          'timeout': '',
          'aNumber': '.*',
          'forwardNumber': '44941',
        },
        {
          'guid': '6a55f135-da09-49c5-bc4b-d86d44cbf7e5',
          'isDefault': true,
          'condition': 'unreachable',
          'enabled': false,
          'priority': 401,
          'service': {
            'key': 'e067cd38-46ec-11ec-bfbe-00155d6f020b',
            'value': 'Forward',
          },
          'scenario': {
            'key': null,
            'value': null,
          },
          'timeout': '',
          'aNumber': '.*',
          'forwardNumber': '',
        },
      ],
    ],
    [
      'noAnswer',
      [
        {
          'guid': '8b7ffa00-2fd4-40ab-b4d2-2908bdabe29b',
          'isDefault': true,
          'condition': 'noAnswer',
          'enabled': false,
          'priority': 501,
          'service': {
            'key': 'e067cd38-46ec-11ec-bfbe-00155d6f020b',
            'value': 'Forward',
          },
          'scenario': {
            'key': null,
            'value': null,
          },
          'timeout': '30',
          'aNumber': '.*',
          'forwardNumber': '',
        },
        {
          'guid': 'ebe4ca48-8d0f-4486-990f-e87b20499ea3',
          'isDefault': false,
          'condition': 'noAnswer',
          'enabled': false,
          'priority': 300,
          'service': {
            'key': 'e067d0b6-46ec-11ec-bfbe-00155d6f020b',
            'value': 'VoiceMailForwarding',
          },
          'scenario': {
            'key': null,
            'value': null,
          },
          'timeout': '10',
          'aNumber': '^3450|44944$',
          'forwardNumber': '',
          'schedule': {
            'permanentSchedule': {
              'template': 'D71F02F055125F4D20FE42504E79DD48',
              'items': [
                {
                  'id': 'monday',
                  'isWorkingDay': true,
                  'date': 'monday',
                  'schedule': [
                    {
                      'from': '08:00',
                      'to': '17:00',
                    },
                  ],
                },
                {
                  'id': 'tuesday',
                  'isWorkingDay': true,
                  'date': 'tuesday',
                  'schedule': [
                    {
                      'from': '08:00',
                      'to': '17:00',
                    },
                  ],
                },
                {
                  'id': 'wednesday',
                  'isWorkingDay': true,
                  'date': 'wednesday',
                  'schedule': [
                    {
                      'from': '00:00',
                      'to': '23:59',
                    },
                  ],
                },
                {
                  'id': 'thursday',
                  'isWorkingDay': true,
                  'date': 'thursday',
                  'schedule': [
                    {
                      'from': '00:00',
                      'to': '23:59',
                    },
                  ],
                },
                {
                  'id': 'friday',
                  'isWorkingDay': true,
                  'date': 'friday',
                  'schedule': [
                    {
                      'from': '00:00',
                      'to': '23:59',
                    },
                  ],
                },
                {
                  'id': 'saturday',
                  'isWorkingDay': false,
                  'date': 'saturday',
                  'schedule': [
                    {
                      'from': '00:00',
                      'to': '23:59',
                    },
                  ],
                },
                {
                  'id': 'sunday',
                  'isWorkingDay': false,
                  'date': 'sunday',
                  'schedule': [
                    {
                      'from': '00:00',
                      'to': '23:59',
                    },
                  ],
                },
              ],
            },
            'specialScheduleItems': [],
          },
        },
      ],
    ],
    [
      'unconditional',
      [
        {
          'guid': '32b04b57-7b9e-4326-bd9e-40f1ef4e5747',
          'isDefault': true,
          'condition': 'unconditional',
          'enabled': false,
          'priority': 400,
          'service': {
            'key': 'e067cd38-46ec-11ec-bfbe-00155d6f020b',
            'value': 'Forward',
          },
          'scenario': {
            'key': null,
            'value': null,
          },
          'timeout': '',
          'aNumber': '.*',
          'forwardNumber': '',
        },
        {
          'guid': 'cc47739a-91e1-45d5-baf9-ad8ba822792b',
          'isDefault': true,
          'condition': 'unconditional',
          'enabled': false,
          'priority': 200,
          'service': {
            'key': 'e067cfed-46ec-11ec-bfbe-00155d6f020b',
            'value': 'DoNotDisturb',
          },
          'scenario': {
            'key': null,
            'value': null,
          },
          'timeout': '',
          'aNumber': '.*',
          'forwardNumber': '',
        },
      ],
    ],
    [
      'busy',
      [
        {
          'guid': '93b15ef2-f383-44f7-b7e2-e5aceed5b159',
          'isDefault': true,
          'condition': 'busy',
          'enabled': false,
          'priority': 502,
          'service': {
            'key': 'e067cd38-46ec-11ec-bfbe-00155d6f020b',
            'value': 'Forward',
          },
          'scenario': {
            'key': null,
            'value': null,
          },
          'timeout': '',
          'aNumber': '.*',
          'forwardNumber': '44941',
        },
      ],
    ],
    [
      'unreachable',
      [
        {
          'guid': '6a55f135-da09-49c5-bc4b-d86d44cbf7e5',
          'isDefault': true,
          'condition': 'unreachable',
          'enabled': false,
          'priority': 401,
          'service': {
            'key': 'e067cd38-46ec-11ec-bfbe-00155d6f020b',
            'value': 'Forward',
          },
          'scenario': {
            'key': null,
            'value': null,
          },
          'timeout': '',
          'aNumber': '.*',
          'forwardNumber': '',
        },
      ],
    ],
  ])
  return {
    useForwardingApi: () => {
      return {
        getForwarding: (condition: string) => {
          return {
            data: forwardings.get(condition),
          }
        },
      }
    },
  }
})

describe('forwarding-settings-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  it('test loadAllForwardings function', async () => {
    const store = useForwardingSettingsStore()
    await store.loadAllForwardings()
    expect(store.forwarding.size).toEqual(5)
  })
  it('test setForwarding function', async () => {
    const store = useForwardingSettingsStore()
    await store.loadAllForwardings()
    const KEY = 'busy' as any
    store.setForwarding(KEY, {
      guid: '93b15ef2-f383-44f7-b7e2-e5aceed5b159',
      isDefault: true,
      condition: KEY,
      enabled: false,
      priority: 1002,
      service: {
        key: 'e067cd38-46ec-11ec-bfbe-00155d6f020b',
        value: 'Forward',
      },
      scenario: {
        key: null,
        value: null,
      },
      timeout: '',
      aNumber: '.*',
      forwardNumber: '44941',
      schedule: {
        'permanentSchedule': {
          'template': 'D71F02F055125F4D20FE42504E79DD48',
          'items': [
            {
              'id': 'monday',
              'isWorkingDay': true,
              'date': 'monday',
              'schedule': [
                {
                  'from': '08:00',
                  'to': '17:00',
                },
              ],
            },
            {
              'id': 'tuesday',
              'isWorkingDay': true,
              'date': 'tuesday',
              'schedule': [
                {
                  'from': '08:00',
                  'to': '17:00',
                },
              ],
            },
            {
              'id': 'wednesday',
              'isWorkingDay': true,
              'date': 'wednesday',
              'schedule': [
                {
                  'from': '00:00',
                  'to': '23:59',
                },
              ],
            },
            {
              'id': 'thursday',
              'isWorkingDay': true,
              'date': 'thursday',
              'schedule': [
                {
                  'from': '00:00',
                  'to': '23:59',
                },
              ],
            },
            {
              'id': 'friday',
              'isWorkingDay': true,
              'date': 'friday',
              'schedule': [
                {
                  'from': '00:00',
                  'to': '23:59',
                },
              ],
            },
            {
              'id': 'saturday',
              'isWorkingDay': false,
              'date': 'saturday',
              'schedule': [
                {
                  'from': '00:00',
                  'to': '23:59',
                },
              ],
            },
            {
              'id': 'sunday',
              'isWorkingDay': false,
              'date': 'sunday',
              'schedule': [
                {
                  'from': '00:00',
                  'to': '23:59',
                },
              ],
            },
          ],
        },
        'specialScheduleItems': [],
      },
    })
    const expected = store.forwarding.get(KEY)
    expect(expected?.length).toEqual(1)
    expect(expected?.at(0)?.priority).toEqual(1002)
  })
  it('test removeForwardingFromStore function', async () => {
    const store = useForwardingSettingsStore()
    await store.loadAllForwardings()
    store.removeForwardingFromStore({
      condition: 'all' as any,
      guid: '8b7ffa00-2fd4-40ab-b4d2-2908bdabe29b',
      schedule: {
        'permanentSchedule': {
          'template': 'D71F02F055125F4D20FE42504E79DD48',
          'items': [
            {
              'id': 'monday',
              'isWorkingDay': true,
              'date': 'monday',
              'schedule': [
                {
                  'from': '08:00',
                  'to': '17:00',
                },
              ],
            },
            {
              'id': 'tuesday',
              'isWorkingDay': true,
              'date': 'tuesday',
              'schedule': [
                {
                  'from': '08:00',
                  'to': '17:00',
                },
              ],
            },
            {
              'id': 'wednesday',
              'isWorkingDay': true,
              'date': 'wednesday',
              'schedule': [
                {
                  'from': '00:00',
                  'to': '23:59',
                },
              ],
            },
            {
              'id': 'thursday',
              'isWorkingDay': true,
              'date': 'thursday',
              'schedule': [
                {
                  'from': '00:00',
                  'to': '23:59',
                },
              ],
            },
            {
              'id': 'friday',
              'isWorkingDay': true,
              'date': 'friday',
              'schedule': [
                {
                  'from': '00:00',
                  'to': '23:59',
                },
              ],
            },
            {
              'id': 'saturday',
              'isWorkingDay': false,
              'date': 'saturday',
              'schedule': [
                {
                  'from': '00:00',
                  'to': '23:59',
                },
              ],
            },
            {
              'id': 'sunday',
              'isWorkingDay': false,
              'date': 'sunday',
              'schedule': [
                {
                  'from': '00:00',
                  'to': '23:59',
                },
              ],
            },
          ],
        },
        'specialScheduleItems': [],
      },
      service: {
        key: 'e067cd38-46ec-11ec-bfbe-00155d6f020b',
        value: 'Forward',
      },
      scenario: {
        key: null,
        value: null,
      },
    } as any)
    const expected = store.forwarding.get('all' as any)
    expect(expected?.length).toEqual(5)
  })
})
