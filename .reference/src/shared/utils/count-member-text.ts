interface WordsForResult {
  forOne: string
  forTwo: string
  forFive: string
}

/**
 * Генерирует правильное окончание слова на основе переданного числа.</br>
 * Передайте число участников и объект со словами, которые можно представить так:</br>
 * forOne - участник (например 1 "участник")</br>
 * forTwo - участника (например 2 "участника")</br>
 * forFive - участников (например 5 "участников")
 *
 * @param membersNumber - Количество участников.
 * @param words - Объект, содержащий слова с разными окончаниями.
 * @returns Слово с правильным окончанием.
 */
const countMemberText = (membersNumber: number, words: WordsForResult): string => {
  const membersNumberToString = membersNumber.toString()

  if (membersNumberToString.endsWith('1') && !(membersNumber > 10 && membersNumber < 20)) {
    return membersNumber + ' ' + words.forOne
  } else if (membersNumberToString.endsWith('2') || membersNumberToString.endsWith('3') || membersNumberToString.endsWith('4')) {
    return membersNumber + ' ' + words.forTwo
  } else {
    return membersNumber + ' ' + words.forFive
  }
}

export default countMemberText
