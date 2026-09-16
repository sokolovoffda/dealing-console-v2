import {
  decodeGroupNameFromRtu,
  encodeGroupNameForRtu,
} from './group-name-rtu-workaround'

describe('group-name-rtu-workaround (WUI-5640)', () => {
  it('should replace spaces with underscores for RTU', () => {
    // Arrange
    const name = '  Группа 1  '

    // Act
    const encoded = encodeGroupNameForRtu(name)

    // Assert
    expect(encoded).toBe('Группа_1')
  })

  it('should keep different numbered group names unique after encode', () => {
    // Arrange / Act / Assert
    expect(encodeGroupNameForRtu('Группа 1')).not.toBe(encodeGroupNameForRtu('Группа 2'))
  })

  it('should restore spaces for UI display', () => {
    // Arrange
    const encoded = 'Группа_1'

    // Act
    const decoded = decodeGroupNameFromRtu(encoded)

    // Assert
    expect(decoded).toBe('Группа 1')
  })

  it('should round-trip spaced names through encode then decode', () => {
    // Arrange
    const name = 'Группа 2'

    // Act
    const result = decodeGroupNameFromRtu(encodeGroupNameForRtu(name))

    // Assert
    expect(result).toBe(name)
  })
})
