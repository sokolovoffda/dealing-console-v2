import { StyleValue } from 'vue'

const keyDelete = '<svg width="40" height="30" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
  '<path d="M36.6667 0H11.6667C10.5167 0 9.61667 0.583334 9.01667 1.46667L0 15L9.01667 28.5167C9.61667 29.4 10.5167 30 11.6667 30H36.6667C38.5 30 40 28.5 40 26.6667V3.33333C40 1.5 38.5 0 36.6667 0ZM31.6667 20.9833L29.3167 23.3333L23.3333 17.35L17.35 23.3333L15 20.9833L20.9833 15L15 9.01667L17.35 6.66667L23.3333 12.65L29.3167 6.66667L31.6667 9.01667L25.6833 15L31.6667 20.9833Z" fill="white"/>\n' +
  '</svg>'
const keyDelete64 = window.btoa(keyDelete)

const keyEnter = '<svg width="30" height="34" viewBox="0 0 30 34" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
  '<path d="M12 10L14.84 12.84L7.66 20H26V0H30V24H7.66L14.84 31.16L12 34L0 22L12 10Z" fill="white"/>\n' +
  '</svg>\n'
const keyEnter64 = window.btoa(keyEnter)

const keyKeyboard_2 = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
  '<path d="M36 0H4C1.8 0 0.02 1.8 0.02 4L0 24C0 26.2 1.8 28 4 28H36C38.2 28 40 26.2 40 24V4C40 1.8 38.2 0 36 0ZM18 6H22V10H18V6ZM18 12H22V16H18V12ZM12 6H16V10H12V6ZM12 12H16V16H12V12ZM10 16H6V12H10V16ZM10 10H6V6H10V10ZM28 24H12V20H28V24ZM28 16H24V12H28V16ZM28 10H24V6H28V10ZM34 16H30V12H34V16ZM34 10H30V6H34V10ZM20 40L28 32H12L20 40Z" fill="white"/>\n' +
  '</svg>'
const keyKeyboard64_2 = window.btoa(keyKeyboard_2)

const keyLang = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
  '<path d="M19.98 0C8.94 0 0 8.96 0 20C0 31.04 8.94 40 19.98 40C31.04 40 40 31.04 40 20C40 8.96 31.04 0 19.98 0ZM33.84 12H27.94C27.3 9.5 26.38 7.1 25.18 4.88C28.86 6.14 31.92 8.7 33.84 12ZM20 4.08C21.66 6.48 22.96 9.14 23.82 12H16.18C17.04 9.14 18.34 6.48 20 4.08ZM4.52 24C4.2 22.72 4 21.38 4 20C4 18.62 4.2 17.28 4.52 16H11.28C11.12 17.32 11 18.64 11 20C11 21.36 11.12 22.68 11.28 24H4.52ZM6.16 28H12.06C12.7 30.5 13.62 32.9 14.82 35.12C11.14 33.86 8.08 31.32 6.16 28ZM12.06 12H6.16C8.08 8.68 11.14 6.14 14.82 4.88C13.62 7.1 12.7 9.5 12.06 12ZM20 35.92C18.34 33.52 17.04 30.86 16.18 28H23.82C22.96 30.86 21.66 33.52 20 35.92ZM24.68 24H15.32C15.14 22.68 15 21.36 15 20C15 18.64 15.14 17.3 15.32 16H24.68C24.86 17.3 25 18.64 25 20C25 21.36 24.86 22.68 24.68 24ZM25.18 35.12C26.38 32.9 27.3 30.5 27.94 28H33.84C31.92 31.3 28.86 33.86 25.18 35.12ZM28.72 24C28.88 22.68 29 21.36 29 20C29 18.64 28.88 17.32 28.72 16H35.48C35.8 17.28 36 18.62 36 20C36 21.38 35.8 22.72 35.48 24H28.72Z" fill="white"/>\n' +
  '</svg>'
const keyLang64 = window.btoa(keyLang)

const keyShift = '<svg width="28" height="32" viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
  '<path d="M0 14L2.82 16.82L12 7.66V32H16V7.66L25.18 16.84L28 14L14 0L0 14Z" fill="white"/>\n' +
  '</svg>\n'
const keyShift64 = window.btoa(keyShift)

const keySpace = '<svg width="32" height="12" viewBox="0 0 32 12" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
  '<path d="M28 0V8H4V0H0V12H32V0H28Z" fill="white"/>\n' +
  '</svg>\n'
const keySpace64 = window.btoa(keySpace)

const keyKeyboard_1 = '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
  '<path d="M40 6H8C5.8 6 4.02 7.8 4.02 10L4 30C4 32.2 5.8 34 8 34H40C42.2 34 44 32.2 44 30V10C44 7.8 42.2 6 40 6ZM22 12H26V16H22V12ZM22 18H26V22H22V18ZM16 12H20V16H16V12ZM16 18H20V22H16V18ZM14 22H10V18H14V22ZM14 16H10V12H14V16ZM32 30H16V26H32V30ZM32 22H28V18H32V22ZM32 16H28V12H32V16ZM38 22H34V18H38V22ZM38 16H34V12H38V16ZM24 46L32 38H16L24 46Z" fill="#AAAAAA"/>\n' +
  '</svg>\n'
const keyKeyboard64_1 = window.btoa(keyKeyboard_1)

let selectedText = ''

const getSelectedText = () => {
  const selection = window.getSelection()
  return selection?.toString() // Возвращает выделенный текст в виде строки
}

const saveSelectedText = () => {
  const text = getSelectedText()
  if (text) {
    selectedText = text
  }
}

document.addEventListener('mouseup', saveSelectedText)
document.addEventListener('touchend', saveSelectedText)

export interface IKeyboardKey {
  upper?: string,
  lower?: string,
  id: string,
  style?: StyleValue,
  event?: string,
  handler?: (value: string) => string
}

export default {
  ru: [
    {
      upper: 'Ё',
      lower: 'ё',
      id: '1',
    },
    {
      upper: '1',
      lower: '!',
      id: '2',
    },
    {
      upper: '2',
      lower: '@',
      id: '3',
    },
    {
      upper: '3',
      lower: '#',
      id: '4',
    },
    {
      upper: '4',
      lower: '$',
      id: '5',
    },
    {
      upper: '5',
      lower: '%',
      id: '6',
    },
    {
      upper: '6',
      lower: '^',
      id: '7',
    },
    {
      upper: '7',
      lower: '&',
      id: '8',
    },
    {
      upper: '8',
      lower: '*',
      id: '9',
    },
    {
      upper: '9',
      lower: '(',
      id: '10',
    },
    {
      upper: '0',
      lower: ')',
      id: '11',
    },
    {
      id: '12',
      style: {
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keyDelete64 + "')",
      },
      event: 'backspace',
      handler: (oldValue: string): string => {
        let result
        if (selectedText) {
          result = oldValue.replace(selectedText, '')
        } else {
          result = oldValue.slice(0, -1)
        }
        selectedText = ''
        return result
      },
    },
    {
      upper: 'Й',
      lower: 'й',
      id: '13',
    },
    {
      upper: 'Ц',
      lower: 'ц',
      id: '14',
    },
    {
      upper: 'У',
      lower: 'у',
      id: '15',
    },
    {
      upper: 'К',
      lower: 'к',
      id: '16',
    },
    {
      upper: 'Е',
      lower: 'е',
      id: '17',
    },
    {
      upper: 'Н',
      lower: 'н',
      id: '18',
    },
    {
      upper: 'Г',
      lower: 'г',
      id: '19',
    },
    {
      upper: 'Ш',
      lower: 'ш',
      id: '20',
    },
    {
      upper: 'Щ',
      lower: 'щ',
      id: '21',
    },
    {
      upper: 'З',
      lower: 'з',
      id: '22',
    },
    {
      upper: 'Х',
      lower: 'х',
      id: '23',
    },
    {
      upper: 'Ъ',
      lower: 'ъ',
      id: '24',
    },
    {
      upper: 'Ф',
      lower: 'ф',
      id: '25',
    },
    {
      upper: 'Ы',
      lower: 'ы',
      id: '26',
    },
    {
      upper: 'В',
      lower: 'в',
      id: '27',
    },
    {
      upper: 'А',
      lower: 'а',
      id: '28',
    },
    {
      upper: 'П',
      lower: 'п',
      id: '29',
    },
    {
      upper: 'Р',
      lower: 'р',
      id: '30',
    },
    {
      upper: 'О',
      lower: 'о',
      id: '31',
    },
    {
      upper: 'Л',
      lower: 'л',
      id: '32',
    },
    {
      upper: 'Д',
      lower: 'д',
      id: '33',
    },
    {
      upper: 'Ж',
      lower: 'ж',
      id: '34',
    },
    {
      upper: 'Э',
      lower: 'э',
      id: '35',
    },
    {
      id: '36',
      style: {
        gridColumnStart: 12,
        gridColumnEnd: 13,
        gridRowStart: 3,
        gridRowEnd: 5,
        // height: '152px',
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keyEnter64 + "')",
      },
      event: 'submitForm',
    },
    {
      id: '37',
      style: {
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keyLang64 + "')",
      },
      event: 'changeLanguage',
    },
    {
      upper: 'Я',
      lower: 'я',
      id: '38',
    },
    {
      upper: 'Ч',
      lower: 'ч',
      id: '39',
    },
    {
      upper: 'С',
      lower: 'с',
      id: '40',
    },
    {
      upper: 'М',
      lower: 'м',
      id: '41',
    },
    {
      upper: 'И',
      lower: 'и',
      id: '42',
    },
    {
      upper: 'Т',
      lower: 'т',
      id: '43',
    },
    {
      upper: 'Ь',
      lower: 'ь',
      id: '44',
    },
    {
      upper: 'Б',
      lower: 'б',
      id: '45',
    },
    {
      upper: 'Ю',
      lower: 'ю',
      id: '46',
    },
    {
      upper: '.',
      lower: '.',
      id: '47',
    },
    {
      id: '48',
      style: {
        gridColumnStart: 1,
        gridColumnEnd: 3,
        // width: '152px',
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keyShift64 + "')",
      },
      event: 'changeCase',
    },
    {
      upper: ' ',
      lower: ' ',
      id: '49',
      style: {
        gridColumnStart: 3,
        gridColumnEnd: 10,
        // width: '552px',
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keySpace64 + "')",
      },
    },
    {
      id: '50',
      style: {
        gridColumnStart: 10,
        gridColumnEnd: 12,
        // width: '152px',
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keyShift64 + "')",
      },
      event: 'changeCase',
    },
    {
      id: '51',
      style: {
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keyKeyboard64_1 + "')",
      },
      event: 'showHideKeyboard',
    },
  ] as IKeyboardKey[],
  eng: [
    {
      upper: '|',
      lower: '\\',
      id: '1',
    },
    {
      upper: '1',
      lower: '!',
      id: '2',
    },
    {
      upper: '2',
      lower: '@',
      id: '3',
    },
    {
      upper: '3',
      lower: '№',
      id: '4',
    },
    {
      upper: '4',
      lower: '%',
      id: '5',
    },
    {
      upper: '5',
      lower: ':',
      id: '6',
    },
    {
      upper: '6',
      lower: ',',
      id: '7',
    },
    {
      upper: '7',
      lower: '.',
      id: '8',
    },
    {
      upper: '8',
      lower: ';',
      id: '9',
    },
    {
      upper: '9',
      lower: '-',
      id: '10',
    },
    {
      upper: '0',
      lower: '_',
      id: '11',
    },
    {
      id: '12',
      style: {
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keyDelete64 + "')",
      },
      event: 'backspace',
      handler: (oldValue: string): string => {
        let result
        if (selectedText) {
          result = oldValue.replace(selectedText, '')
        } else {
          result = oldValue.slice(0, -1)
        }
        selectedText = ''
        return result
      },
    },
    {
      upper: 'Q',
      lower: 'q',
      id: '13',
    },
    {
      upper: 'W',
      lower: 'w',
      id: '14',
    },
    {
      upper: 'E',
      lower: 'e',
      id: '15',
    },
    {
      upper: 'R',
      lower: 'r',
      id: '16',
    },
    {
      upper: 'T',
      lower: 't',
      id: '17',
    },
    {
      upper: 'Y',
      lower: 'y',
      id: '18',
    },
    {
      upper: 'U',
      lower: 'u',
      id: '19',
    },
    {
      upper: 'I',
      lower: 'i',
      id: '20',
    },
    {
      upper: 'O',
      lower: 'o',
      id: '21',
    },
    {
      upper: 'P',
      lower: 'p',
      id: '22',
    },
    {
      upper: '{',
      lower: '[',
      id: '23',
    },
    {
      upper: '}',
      lower: ']',
      id: '24',
    },
    {
      upper: 'A',
      lower: 'a',
      id: '25',
    },
    {
      upper: 'S',
      lower: 's',
      id: '26',
    },
    {
      upper: 'D',
      lower: 'd',
      id: '27',
    },
    {
      upper: 'F',
      lower: 'f',
      id: '28',
    },
    {
      upper: 'G',
      lower: 'g',
      id: '29',
    },
    {
      upper: 'H',
      lower: 'h',
      id: '30',
    },
    {
      upper: 'J',
      lower: 'j',
      id: '31',
    },
    {
      upper: 'K',
      lower: 'k',
      id: '32',
    },
    {
      upper: 'L',
      lower: 'l',
      id: '33',
    },
    {
      upper: ':',
      lower: ';',
      id: '34',
    },
    {
      upper: '\'',
      lower: '"',
      id: '35',
    },
    {
      id: '36',
      style: {
        gridColumnStart: 12,
        gridColumnEnd: 13,
        gridRowStart: 3,
        gridRowEnd: 5,
        // height: '152px',
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keyEnter64 + "')",
      },
      event: 'submitForm',
    },
    {
      id: '37',
      style: {
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keyLang64 + "')",
      },
      event: 'changeLanguage',
    },
    {
      upper: 'Z',
      lower: 'z',
      id: '38',
    },
    {
      upper: 'X',
      lower: 'x',
      id: '39',
    },
    {
      upper: 'C',
      lower: 'c',
      id: '40',
    },
    {
      upper: 'V',
      lower: 'v',
      id: '41',
    },
    {
      upper: 'B',
      lower: 'b',
      id: '42',
    },
    {
      upper: 'N',
      lower: 'n',
      id: '43',
    },
    {
      upper: 'M',
      lower: 'm',
      id: '44',
    },
    {
      upper: '<',
      lower: ',',
      id: '45',
    },
    {
      upper: '>',
      lower: '?',
      id: '46',
    },
    {
      upper: '.',
      lower: '.',
      id: '47',
    },
    {
      id: '48',
      style: {
        gridColumnStart: 1,
        gridColumnEnd: 3,
        // width: '152px',
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keyShift64 + "')",
      },
      event: 'changeCase',
    },
    {
      upper: ' ',
      lower: ' ',
      id: '49',
      style: {
        gridColumnStart: 3,
        gridColumnEnd: 10,
        // width: '552px',
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keySpace64 + "')",
      },
    },
    {
      id: '50',
      style: {
        gridColumnStart: 10,
        gridColumnEnd: 12,
        // width: '152px',
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keyShift64 + "')",
      },
      event: 'changeCase',
    },
    {
      id: '51',
      style: {
        background: '#444444 no-repeat 50% 50%',
        'background-image': "url('data:image/svg+xml;base64," + keyKeyboard64_2 + "')",
      },
      event: 'showHideKeyboard',
    },
  ] as IKeyboardKey[],
}
