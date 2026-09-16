import { setActivePinia, createPinia } from 'pinia'

import { useEnvSettingsStore } from './use-env-settings'

describe('Env settings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('get default env settings state', () => {
    const { settings } = useEnvSettingsStore()
    expect(settings).toEqual([])
  })
})
