import { mount, flushPromises } from '@vue/test-utils'
import { vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'

import type { ContextMenuPlacement } from './types'
import { useContextMenuPosition } from './use-context-menu-position'

type HarnessOptions = {
  placement?: ContextMenuPlacement
  anchorType?: 'element' | 'point'
  point?: { x: number, y: number }
}

type PositionHarness = {
  wrapper: ReturnType<typeof mount>
  open: ReturnType<typeof ref<boolean>>
  menuRef: HTMLElement
  setElementAnchor: (element: HTMLElement) => void
  getPosition: () => { left: number, top: number }
}

const mountPositionHarness = ({
  placement = 'bottom-start',
  anchorType = 'element',
  point = { x: 100, y: 200 },
}: HarnessOptions = {}): PositionHarness => {
  const open = ref(false)
  const menuRef = ref<HTMLElement | null>(null)
  const anchor = ref<{ type: 'element', element: HTMLElement } | { type: 'point', point: { x: number, y: number } } | null>(
    anchorType === 'point'
      ? { type: 'point', point }
      : null,
  )

  const Harness = defineComponent({
    setup () {
      const { position } = useContextMenuPosition({
        open,
        anchor,
        menu: menuRef,
        placement,
      })

      return {
        open,
        menuRef,
        position,
        anchor,
        setElementAnchor: (element: HTMLElement) => {
          anchor.value = { type: 'element', element }
        },
      }
    },
    template: `
      <div>
        <div data-test="activator">activator</div>
        <div
          ref="menuRef"
          data-test="menu"
          :style="{ width: '220px', height: '120px' }"
        >
          menu
        </div>
        <div data-test="position">{{ position.left }},{{ position.top }}</div>
      </div>
    `,
  })

  const wrapper = mount(Harness)
  const menuElement = wrapper.find('[data-test="menu"]').element as HTMLElement

  return {
    wrapper,
    open,
    menuRef: menuElement,
    setElementAnchor: (wrapper.vm as { setElementAnchor: (element: HTMLElement) => void }).setElementAnchor,
    getPosition: () => {
      const text = wrapper.find('[data-test="position"]').text()
      const [left, top] = text.split(',').map(Number)

      return { left, top }
    },
  }
}

describe('useContextMenuPosition', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should position menu below activator for bottom-start placement', async () => {
    const harness = mountPositionHarness({ placement: 'bottom-start' })
    const activator = harness.wrapper.find('[data-test="activator"]').element as HTMLElement

    activator.getBoundingClientRect = () => ({
      left: 40,
      top: 60,
      right: 140,
      bottom: 100,
      width: 100,
      height: 40,
      x: 40,
      y: 60,
      toJSON: () => ({}),
    })

    harness.menuRef.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 220,
      bottom: 120,
      width: 220,
      height: 120,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    harness.setElementAnchor(activator)
    harness.open.value = true

    await nextTick()
    await flushPromises()

    expect(harness.getPosition()).toEqual({
      left: 40,
      top: 104,
    })
  })

  it('should clamp menu position to viewport padding', async () => {
    const harness = mountPositionHarness({ placement: 'bottom-start' })
    const activator = harness.wrapper.find('[data-test="activator"]').element as HTMLElement

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 300 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 200 })

    activator.getBoundingClientRect = () => ({
      left: 250,
      top: 150,
      right: 300,
      bottom: 180,
      width: 50,
      height: 30,
      x: 250,
      y: 150,
      toJSON: () => ({}),
    })

    harness.menuRef.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 220,
      bottom: 120,
      width: 220,
      height: 120,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    harness.setElementAnchor(activator)
    harness.open.value = true

    await nextTick()
    await flushPromises()

    expect(harness.getPosition()).toEqual({
      left: 72,
      top: 72,
    })
  })

  it('should position menu from cursor point anchor', async () => {
    const harness = mountPositionHarness({
      placement: 'bottom-start',
      anchorType: 'point',
      point: { x: 16, y: 24 },
    })

    harness.menuRef.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 180,
      bottom: 80,
      width: 180,
      height: 80,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    harness.open.value = true

    await nextTick()
    await flushPromises()

    expect(harness.getPosition()).toEqual({
      left: 16,
      top: 28,
    })
  })
})
