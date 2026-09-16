import { vi } from 'vitest'

import { runSettingsLeaveFlush } from '../lib/run-settings-leave-flush'

describe('runSettingsLeaveFlush', () => {
  it('should run flush tasks sequentially in order', async () => {
    // Arrange
    const order: string[] = []
    const tasks = [
      async () => {
        order.push('main')
      },
      async () => {
        order.push('goose')
      },
      async () => {
        order.push('overrides')
      },
    ]

    // Act
    await runSettingsLeaveFlush(tasks)

    // Assert
    expect(order).toEqual(['main', 'goose', 'overrides'])
  })

  it('should continue after a failed task and report the error', async () => {
    // Arrange
    const onError = vi.fn()
    const order: string[] = []
    const tasks = [
      async () => {
        throw new Error('main failed')
      },
      async () => {
        order.push('goose')
      },
    ]

    // Act
    await runSettingsLeaveFlush(tasks, onError)

    // Assert
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(order).toEqual(['goose'])
  })
})
