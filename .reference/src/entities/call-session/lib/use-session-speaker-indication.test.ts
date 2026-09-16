import { ref } from 'vue'

import {
  VOICE_INDICATION_THRESHOLD,
  VOICE_LEVEL_FULL_SCALE,
  volumeToPercent,
} from './use-session-speaker-indication'

describe('use-session-speaker-indication volume mapping', () => {
  it('should map analyser volume to 0..100 percent with full-scale clamp', () => {
    // Arrange / Act / Assert
    expect(volumeToPercent(0)).toBe(0)
    expect(volumeToPercent(VOICE_LEVEL_FULL_SCALE / 2)).toBe(50)
    expect(volumeToPercent(VOICE_LEVEL_FULL_SCALE)).toBe(100)
    expect(volumeToPercent(VOICE_LEVEL_FULL_SCALE * 2)).toBe(100)
  })

  it('should keep indication threshold for boolean VD', () => {
    // Arrange / Act / Assert
    expect(VOICE_INDICATION_THRESHOLD).toBe(1)
  })

  it('should accept optional voiceLevel ref updates contract via volumeToPercent', () => {
    // Arrange
    const voiceLevel = ref(0)

    // Act
    voiceLevel.value = volumeToPercent(VOICE_LEVEL_FULL_SCALE * 0.25)

    // Assert
    expect(voiceLevel.value).toBe(25)
  })
})
