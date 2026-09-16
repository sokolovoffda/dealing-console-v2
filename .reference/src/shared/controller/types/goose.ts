export type SenderGoose = string

export const gooseButtons = {
  ONE: ':key_1_1',
  TWO: ':key_1_2',
  THREE: ':key_1_3',
  FOUR: ':key_1_4',
  FIVE: ':key_1_5',
  SIX: ':key_1_6',
  SEVEN: ':key_1_7',
  EIGHT: ':key_1_8',
  NINE: ':key_1_9',
  KEY_SPEAK: ':key_speak',
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
    type ButtonKeys = Exclude<StringKeys, 'transformValues' | 'getValues'>
    const transformed: Record<ButtonKeys, string> = {} as Record<ButtonKeys, string>;
    ([...this] as { key: ButtonKeys, value: string }[]).forEach(({ key, value }) => {
      transformed[key] = `${arg}${value}`
    })
    return transformed
  },
  getValues: function (arg: string): string[] {
    type StringKeys = Extract<keyof typeof this, string>;
    type ButtonKeys = Exclude<StringKeys, 'transformValues' | 'getValues'>
    return ([...this] as { key: ButtonKeys, value: string }[]).map(({ value }) => arg + value)
  },
} as const
