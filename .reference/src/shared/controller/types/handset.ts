export type SenderHandset = string

export type HandsetButtonValue = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '0' | '*' | '#' | 'answer' | 'decline'

export const handsetButtons = {
  HANDSET: ':handset', // Телефонная трубка
  MUTE: ':key_handset_mute',
  ONE: ':key_1_1', // 1
  TWO: ':key_2_1', // 2
  THREE: ':key_3_1', // 3
  FOUR: ':key_1_2', // 4
  FIVE: ':key_2_2', // 5
  SIX: ':key_3_2', // 6
  SEVEN: ':key_1_3', // 7
  EIGHT: ':key_2_3', // 8
  NINE: ':key_3_3', // 9
  STAR: ':key_1_4', // *
  ZERO: ':key_2_4', // 0
  GRID: ':key_3_4', // #
  ANSWER: ':key_answer', // Ответить на звонок
  DECLINE: ':key_decline', // Отклонить звонок
  [Symbol.iterator]: function () {
    const entries = Object.entries(this).filter(([, value]) => typeof value !== 'function')
    let index = 0

    return {
      next () {
        if (index < entries.length) {
          const [key, value] = entries[index++]
          return { value: { key, value }, done: false }
        } else {
          return { done: true }
        }
      },
    }
  },
  transformValues: function (arg: string) {
    type StringKeys = Extract<keyof typeof this, string>;
    type ButtonKeys = Exclude<StringKeys, 'transformValues'>
    const transformed: Record<ButtonKeys, string> = {} as Record<ButtonKeys, string>;
    ([...this] as { key: ButtonKeys, value: string }[]).forEach(({ key, value }) => {
      transformed[key] = `${arg}${value}`
    })
    return transformed
  },
} as const
