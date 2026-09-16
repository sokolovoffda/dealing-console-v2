import { resolveWidgetViewport } from './widget-viewport'

describe('resolveWidgetViewport', () => {
  it('should resolve two-equal layout to half viewport for both columns', () => {
    // Arrange & Act & Assert
    expect(resolveWidgetViewport('two-equal', 0)).toBe('half')
    expect(resolveWidgetViewport('two-equal', 1)).toBe('half')
  })

  it('should resolve two-left-narrow layout by position', () => {
    // Arrange & Act & Assert
    expect(resolveWidgetViewport('two-left-narrow', 0)).toBe('one-third')
    expect(resolveWidgetViewport('two-left-narrow', 1)).toBe('two-thirds')
  })

  it('should resolve two-right-narrow layout by position', () => {
    // Arrange & Act & Assert
    expect(resolveWidgetViewport('two-right-narrow', 0)).toBe('two-thirds')
    expect(resolveWidgetViewport('two-right-narrow', 1)).toBe('one-third')
  })

  it('should resolve three-equal layout to one-third for every column', () => {
    // Arrange & Act & Assert
    expect(resolveWidgetViewport('three-equal', 0)).toBe('one-third')
    expect(resolveWidgetViewport('three-equal', 1)).toBe('one-third')
    expect(resolveWidgetViewport('three-equal', 2)).toBe('one-third')
  })
})
