/* eslint-disable vue/require-default-prop */
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { defineComponent } from 'vue'

const mockedCallCardStore = vi.hoisted(() => ({
  handsetSlots: {
    __v_isRef: true,
    value: [
      {
        id: 'left',
        title: 'Левая',
        disabled: false,
      },
      {
        id: 'right',
        title: 'Правая',
        disabled: false,
      },
    ],
  },
  footerHandsetViewByHandsetId: {
    __v_isRef: true,
    value: {
      left: {
        disabled: false,
        icon: 'phoneM',
        id: 'left',
        statusText: 'Свободна',
        title: 'Левая',
        tone: 'neutcon',
      },
      right: {
        disabled: false,
        icon: 'phoneInvM',
        id: 'right',
        statusText: 'Свободна',
        title: 'Правая',
        tone: 'neutcon',
      },
    },
  },
  isOpen: { __v_isRef: true, value: false },
  openHandset: vi.fn((id: 'left' | 'right') => {
    mockedCallCardStore.selectedHandsetId.value = id
    mockedCallCardStore.isOpen.value = true

    return true
  }),
  selectedHandsetId: { __v_isRef: true, value: 'left' },
}))

vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pinia')>()

  return {
    ...actual,
    storeToRefs: () => ({
      footerHandsetViewByHandsetId: mockedCallCardStore.footerHandsetViewByHandsetId,
      handsetSlots: mockedCallCardStore.handsetSlots,
      isOpen: mockedCallCardStore.isOpen,
      selectedHandsetId: mockedCallCardStore.selectedHandsetId,
    }),
  }
})

vi.mock('@/features/call-card', () => ({
  CALL_CARD_HANDSET_IDS: {
    left: 'left',
    right: 'right',
  },
  useCallCardStore: () => mockedCallCardStore,
}))

import Component from '../ui/FooterHandsetControls.vue'

const FooterHandsetButtonStub = defineComponent({
  name: 'FooterHandsetButton',
  props: {
    icon: String,
    id: String,
    title: String,
    tone: String,
    statusText: String,
    selected: Boolean,
    disabled: Boolean,
  },
  emits: ['click'],
  template: `
    <button
      :data-test="id"
      :data-selected="String(selected)"
      :disabled="disabled"
      @click="$emit('click')"
    />
  `,
})

describe('FooterHandsetControls.vue', () => {
  const createComponent = () => mount(Component, {
    global: {
      stubs: {
        FooterHandsetButton: FooterHandsetButtonStub,
      },
    },
  })

  beforeEach(() => {
    mockedCallCardStore.handsetSlots.value = [
      {
        id: 'left',
        title: 'Левая',
        disabled: false,
      },
      {
        id: 'right',
        title: 'Правая',
        disabled: false,
      },
    ]
    mockedCallCardStore.footerHandsetViewByHandsetId.value = {
      left: {
        disabled: false,
        icon: 'phoneM',
        id: 'left',
        statusText: 'Свободна',
        title: 'Левая',
        tone: 'neutcon',
      },
      right: {
        disabled: false,
        icon: 'phoneInvM',
        id: 'right',
        statusText: 'Свободна',
        title: 'Правая',
        tone: 'neutcon',
      },
    }
    mockedCallCardStore.selectedHandsetId.value = 'left'
    mockedCallCardStore.isOpen.value = false
    mockedCallCardStore.openHandset.mockClear()
  })

  it('renders selected left handset and both free handsets from call card store', () => {
    const wrapper = createComponent()
    const buttons = wrapper.findAllComponents(FooterHandsetButtonStub)

    expect(buttons).toHaveLength(2)
    expect(buttons[0].props()).toMatchObject({
      id: 'left',
      icon: 'phoneM',
      title: 'Левая',
      tone: 'neutcon',
      statusText: 'Свободна',
      selected: true,
      disabled: false,
    })
    expect(buttons[1].props()).toMatchObject({
      id: 'right',
      icon: 'phoneInvM',
      title: 'Правая',
      tone: 'neutcon',
      statusText: 'Свободна',
      selected: false,
      disabled: false,
    })
  })

  it('opens clicked available handset through call card store', async () => {
    const wrapper = createComponent()

    await wrapper.get('[data-test="right"]').trigger('click')

    expect(mockedCallCardStore.openHandset).toHaveBeenCalledWith('right')
  })

  it('does not reopen already selected handset while card is open', async () => {
    mockedCallCardStore.isOpen.value = true

    const wrapper = createComponent()

    await wrapper.get('[data-test="left"]').trigger('click')

    expect(mockedCallCardStore.openHandset).not.toHaveBeenCalled()
  })

  it('opens disabled handset with activity for card view', async () => {
    // Arrange
    mockedCallCardStore.footerHandsetViewByHandsetId.value.left = {
      disabled: false,
      icon: 'phoneCallF',
      id: 'left',
      statusText: '101',
      title: '101',
      tone: 'warncon',
    }

    const wrapper = createComponent()

    // Act
    await wrapper.get('[data-test="left"]').trigger('click')

    // Assert
    expect(mockedCallCardStore.openHandset).toHaveBeenCalledWith('left')
  })

  it('does not open disabled handset without activity', async () => {
    // Arrange
    mockedCallCardStore.footerHandsetViewByHandsetId.value.left = {
      disabled: true,
      icon: 'phoneM',
      id: 'left',
      statusText: 'Свободна',
      title: 'Левая',
      tone: 'neutcon',
    }

    const wrapper = createComponent()

    // Act
    await wrapper.get('[data-test="left"]').trigger('click')

    // Assert
    expect(mockedCallCardStore.openHandset).not.toHaveBeenCalled()
  })
})
