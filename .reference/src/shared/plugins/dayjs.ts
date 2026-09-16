import { locale, extend } from 'dayjs'
import 'dayjs/locale/ru'
import duration from 'dayjs/plugin/duration'
import isBetween from 'dayjs/plugin/isBetween'
import isoWeek from 'dayjs/plugin/isoWeek'
import isToday from 'dayjs/plugin/isToday'
import isYesterday from 'dayjs/plugin/isYesterday'
import relativeTime from 'dayjs/plugin/relativeTime'

locale('ru')

extend(isoWeek)
extend(isToday)
extend(isBetween)
extend(isYesterday)
extend(duration)
extend(relativeTime)
