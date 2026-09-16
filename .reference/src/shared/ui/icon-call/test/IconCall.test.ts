import { createTestingPinia } from '@pinia/testing'
import { mount, VueWrapper } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'

import { CallHistoryItem } from '@/entities/call-history'

import Component from '../IconCall.vue'

vi.mock('@/shared/composables', () => {
  return {
    useAutoAnswer: () => {
      return {
        checkAutoAnswerAndGetDevice: vi.fn(),
      }
    },
    useAppStore: () => {
      return {
        currentUser: ref({ imLogin: 'pServed1' }),
      }
    },
  }
})

describe('IconCall.vue', () => {
  let wrapper: VueWrapper<typeof Component>

  const mockCallHistoryItemDefault: CallHistoryItem = {
    item: {
      rank: 32,
      eventId: 14221412414,
      type: 'MessageCallReceived',
      to: '4421',
      from: '13123',
      pServed: 'pServed',
      timestamp: 1124124125125215,
      event: 'call_answered',
      srcPServed: 'pServed1',
      srcName: 'srcName',
      srcNumber: 'srcNumber',
      dstPServed: 'dstPServed',
      dstName: 'dstName',
      dstNumber: 'dstNumber',
    },
    type: 42,
    eventId: 4124141,
    rank: 2,
    status: 2,
    timestamp: 14123412414,
  }
  const createComponent = function (event: typeof mockCallHistoryItemDefault.item.event) {
    const mockCallHistoryItem = JSON.parse(JSON.stringify(mockCallHistoryItemDefault))
    mockCallHistoryItem.item.event = event

    wrapper = mount(Component, {
      props: {
        call: mockCallHistoryItem,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    }) as unknown as VueWrapper<typeof Component>
  }

  it('test computed isOutgoing, isWarning, iconName', async () => {
    createComponent('call_answered')
    const VM = wrapper.vm
    expect(VM.isOutgoing).toBe(true)
    expect(VM.isWarning).toBe(false)
    expect(VM.iconName).toBe('callOutgoing')
    expect(VM.iconClass).toBe('text-positive-shades-900')

    const mockCallHistoryItem = JSON.parse(JSON.stringify(mockCallHistoryItemDefault))
    mockCallHistoryItem.item.event = 'call_missed'
    mockCallHistoryItem.item.srcPServed = 'pServed2'

    await wrapper.setProps({ call: mockCallHistoryItem })
    expect(VM.isOutgoing).toBe(false)
    expect(VM.isWarning).toBe(true)
    expect(VM.iconName).toBe('callIncoming')
    expect(VM.iconClass).toBe('text-red-shades-800')

  })
})
