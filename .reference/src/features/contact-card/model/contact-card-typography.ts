const CONTACT_CARD_NUMBER_TYPOGRAPHY = [
  { maxLength: 5, className: 'text-body-r-32-48' },
  { maxLength: 7, className: 'text-body-r-30-42' },
  { maxLength: 9, className: 'text-body-r-28-40' },
  { maxLength: 11, className: 'text-body-r-26-36' },
  { maxLength: 13, className: 'text-body-r-24-34' },
  { maxLength: 14, className: 'text-body-r-22-30' },
]

export const CONTACT_CARD_TYPOGRAPHY = {
  name: 'text-body-r-20-32',
} as const

export const getContactCardNumberTypography = (value: string) => {
  const numberLength = value.trim().length
  return CONTACT_CARD_NUMBER_TYPOGRAPHY.find(({ maxLength }) => numberLength <= maxLength)?.className
    ?? 'text-body-r-20-32'
}
