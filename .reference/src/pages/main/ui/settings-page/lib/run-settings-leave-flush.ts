type SettingsLeaveFlushTask = () => Promise<unknown>

/**
 * Sequential leave flush for Settings shell.
 * Order: main → goose → overrides (flush Main volume then saveIfDirty).
 * Failures are logged; navigation is not blocked.
 */
export const runSettingsLeaveFlush = async (
  tasks: SettingsLeaveFlushTask[],
  onError: (error: unknown) => void = (error) => {
    console.error('[settings] Failed to flush pending settings on leave:', error)
  },
): Promise<void> => {
  for (const task of tasks) {
    try {
      await task()
    } catch (error) {
      onError(error)
    }
  }
}
