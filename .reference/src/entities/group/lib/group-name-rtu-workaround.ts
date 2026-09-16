/**
 * Временный обход WUI-5640 для старого RTU (2.3.2-11s):
 * пробел в имени группы считается концом имени → дубли «Группа 1» / «Группа 2».
 * На RTU шлём пробелы как `_`, в UI показываем обратно с пробелами.
 */

export const encodeGroupNameForRtu = (name: string): string => {
  return name.trim().replaceAll(' ', '_')
}

export const decodeGroupNameFromRtu = (name: string): string => {
  return name.replaceAll('_', ' ')
}
