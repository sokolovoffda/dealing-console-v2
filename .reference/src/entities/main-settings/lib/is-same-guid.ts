export const normalizeGuid = (guid?: string) => (guid ?? '').replace(/-/g, '').toLowerCase()

export const isSameGuid = (left?: string, right?: string) => {
  if (!left || !right) return false
  return normalizeGuid(left) === normalizeGuid(right)
}

export const findRingtoneByGuid = <T extends { guid: string }>(
  ringtones: Iterable<T>,
  guid: string,
) => {
  for (const item of ringtones) {
    if (isSameGuid(item.guid, guid)) {
      return item
    }
  }

  return undefined
}
