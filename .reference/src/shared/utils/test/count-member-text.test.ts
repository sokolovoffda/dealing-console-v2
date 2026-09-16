import countMemberText from '@/shared/utils/count-member-text'

describe('test count-member-text', () => {
  it('should ', () => {
    const numbers = [23,5,1,11,3,55]
    const results: string[] = []
    numbers.forEach(number => {
      const result = countMemberText(number, {
        forOne: 'человек',
        forTwo: 'человека',
        forFive: 'человек',
      })
      results.push(result)
    })
    const expectedArray = ['23 человека', '5 человек', '1 человек', '11 человек', '3 человека', '55 человек']
    expectedArray.forEach((value, index) => {
      expect(value).toEqual(results[index])
    })
  })
})
