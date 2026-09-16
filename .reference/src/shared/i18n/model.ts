import { useTranslations } from '@wui/common-library'
import { computed, nextTick, readonly, ref, Ref } from 'vue'
import { createI18n, I18n } from 'vue-i18n'

import { Locales, LocalizationItem } from './types'

const LOCAL_STORAGE_KEY = 'i18n'
const currentLocale: Ref<Locales> = ref(getLocaleFromLocalStorage())
const messages = {} as { [key in Locales]: LocalizationItem }

const i18n = await (async function setupI18n () {
  const locale = currentLocale.value
  const data = await import(`../../app/assets/locales/${locale}.json`)
  const info = data.default

  if (!messages[locale]) {
    messages[locale] = {}
  }

  messages[locale] = {
    ...messages[locale],
    ...info[locale],
  }

  const i18N = createI18n({
    locale,
    fallbackLocale: Locales.RU_RU,
    messages: data.default,
  })

  setI18nLanguage(i18N)

  return i18N
})()

const t = i18n.global.t
handleLocaleChange()

function getLocaleFromLocalStorage (): Locales {
  const DEFAULT_LOCALE = Locales.RU_RU
  try {
    const locale = localStorage.getItem(LOCAL_STORAGE_KEY) as Locales | null
    return locale ? locale : DEFAULT_LOCALE
  } catch (e) {
    console.error(e)
    return DEFAULT_LOCALE
  }
}

function handleLocaleChange () {
  const { setTranslations } = useTranslations()
  if (messages[currentLocale.value]) {
    setTranslations((key: string) => {
      return t(key)
    }, {
      include: [
        'Back',
        'Finish',
        'Next',
        'Skip',
        'Start',
        'Cancel',
        'ByDefault',
        'NoData',
        'Title',
        'Category',
        'ListenToAudio',
        'Note',
        'Action',
        'ResetSettings',
        'ResetSettingsConfirmTitle',
        'ResetSettingsDescription',
        'common.paginatorFrom',
        'common.paginatorPerPage',
        'login.authorization',
        'login.domain',
        'login.password',
        'login.submit',
        'login.username',
        'login.welcome',
      ],
    })
  }
}


function setI18nLanguage (i18n: I18n) {
  const locale = currentLocale.value
  i18n.global.locale = locale
  document.querySelector('html')?.setAttribute('lang', locale)
}

async function loadLocaleMessages () {
  const locale = currentLocale.value
  const data = await import(`../../app/assets/locales/${locale}.json`)
  const m = data.default

  if (!messages[locale]) {
    messages[locale] = {}
  }

  messages[locale] = {
    ...messages[locale],
    ...m[locale],
  }

  const localeMessages = messages[locale]

  i18n.global.setLocaleMessage(locale, localeMessages)

  return nextTick()
}

export const useLocalization = () => {
  const translations = {
    [Locales.RU_RU]: {
      'ru-RU': 'Русский',
      'en-GB': 'English (Английский)',
      'zh-CN': '简体中文 (Китайский упрощенный)',
      'zh-TW': '繁體中文 (Китайский традиционный)',
    },
    [Locales.EN_GB]: {
      'ru-RU': 'Русский (Russian)',
      'en-GB': 'English',
      'zh-CN': '简体中文 (Chinese Simplified)',
      'zh-TW': '繁體中文 (Chinese Traditional)',
    },
    [Locales.ZH_CN]: {
      'ru-RU': 'Русский (俄语)',
      'en-GB': 'English (英语)',
      'zh-CN': '简体中文',
      'zh-TW': '繁体中文',
    },
    [Locales.ZH_TW]: {
      'ru-RU': 'Русский (俄語)',
      'en-GB': 'English (英語)',
      'zh-CN': '簡體中文',
      'zh-TW': '繁體中文',
    },
  }

  const setLocale = async (locale: Locales) => {
    currentLocale.value = locale
    await loadLocaleMessages()
    setI18nLanguage(i18n)
    localStorage.setItem(LOCAL_STORAGE_KEY, locale)
    handleLocaleChange()
  }

  const getLocales = () => {
    const locales: Record<Locales, string> = translations[currentLocale.value]
    return Object.values(Locales).reduce((acc, locale) => {
      const res = locales[locale]
      if (res) {
        acc.push({ key: locale, value: res })
      }
      return acc
    }, [] as Array<{ key: Locales, value: string }>)
  }

  const getCurrentLocale = computed(() => {
    const locales: Record<Locales, string> = translations[currentLocale.value]
    return locales[currentLocale.value]
  })

  return {
    i18n,
    t,
    currentLocale: readonly(currentLocale),
    getCurrentLocale,
    getLocales,
    setLocale,
  }
}
