import dayjs from 'dayjs'
import { ref } from 'vue'

const TIME_FORMAT = 'HH:mm'
const DATE_FORMAT = 'DD.MM.YY'

const currentTime = ref(dayjs().format(TIME_FORMAT)) // HH:mm
const currentDate = ref(dayjs().format(DATE_FORMAT))
let dateIntervalId: ReturnType<typeof setInterval>

const now = dayjs()
const tomorrowsMidnight = now.add(1, 'day').hour(0).minute(0).second(0).millisecond(0)
const timeToMidnight = tomorrowsMidnight.diff(now)

const timeIntervalId = setInterval(() => {
  currentTime.value = dayjs().format(TIME_FORMAT)
}, 60 * 1000)


const updateCurrentDate = () => {
  currentDate.value = dayjs().format(DATE_FORMAT)
}

setTimeout(() => {
  updateCurrentDate()
  dateIntervalId = setInterval(updateCurrentDate, 24 * 60 * 60 * 1000)
}, timeToMidnight)

const clearIntervals = () => {
  clearInterval(timeIntervalId)
  clearInterval(dateIntervalId)
}

export { currentTime, currentDate, clearIntervals }
