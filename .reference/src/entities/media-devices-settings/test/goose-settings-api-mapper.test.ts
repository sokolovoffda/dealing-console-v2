import { vi } from 'vitest'

import {
  normalizeGooseSettingsFromApi,
  sanitizeGooseSettingsPutForApi,
} from '../lib/goose-settings-api-mapper'

describe('goose-settings-api-mapper', () => {
  it('should map preferredGooseModuleId from API to preferredGooseId', () => {
    // Arrange
    const apiDto = {
      schemaVersion: 1 as const,
      preferredGooseModuleId: 'goose_L1',
      mode: 'pushToTalk' as const,
      pttScope: 'activePinned' as const,
    }

    // Act
    const result = normalizeGooseSettingsFromApi(apiDto)

    // Assert
    expect(result).toEqual({
      schemaVersion: 1,
      preferredGooseId: 'goose_L1',
      mode: 'pushToTalk',
      pttScope: 'activePinned',
    })
  })

  it('should map null and empty preferredGooseModuleId to null', () => {
    // Arrange / Act / Assert
    expect(
      normalizeGooseSettingsFromApi({
        schemaVersion: 1,
        preferredGooseModuleId: null,
        mode: 'stateful',
        pttScope: 'standard',
      }),
    ).toMatchObject({ preferredGooseId: null })

    expect(
      normalizeGooseSettingsFromApi({
        schemaVersion: 1,
        preferredGooseModuleId: '',
        mode: 'stateful',
        pttScope: 'standard',
      }),
    ).toMatchObject({ preferredGooseId: null })
  })

  it('should fallback unknown mode and pttScope from API to defaults', () => {
    // Arrange
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    // Act
    const result = normalizeGooseSettingsFromApi({
      schemaVersion: 1,
      preferredGooseModuleId: 'goose_R1',
      mode: 'unknown' as never,
      pttScope: 'unknown' as never,
    })

    // Assert
    expect(result).toEqual({
      schemaVersion: 1,
      preferredGooseId: 'goose_R1',
      mode: 'stateful',
      pttScope: 'standard',
    })
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('should map preferredGooseId put body to preferredGooseModuleId for API', () => {
    // Arrange / Act
    const result = sanitizeGooseSettingsPutForApi({
      schemaVersion: 1,
      preferredGooseId: 'goose_L1',
      mode: 'stateful',
      pttScope: 'standard',
    })

    // Assert
    expect(result).toEqual({
      schemaVersion: 1,
      preferredGooseModuleId: 'goose_L1',
      mode: 'stateful',
      pttScope: 'standard',
    })
  })

  it('should map empty preferredGooseId put body to null for API', () => {
    // Arrange / Act / Assert
    expect(
      sanitizeGooseSettingsPutForApi({
        preferredGooseId: '',
      }),
    ).toEqual({
      preferredGooseModuleId: null,
    })
  })
})
