import { bootstrapStyles } from '@wui/common-library'
import 'core-js/features/array/at'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

// eslint-disable-next-line no-restricted-imports
import { imPlugin } from '@/app/plugins/im'

import { setupAxiosInterceptor } from '@/shared/auth'
import { useLocalization } from '@/shared/i18n'
import { loadStandConfigFromElectron } from '@/shared/stand-config'

import App from './app/App.vue'
import router from './app/router'

import '@/shared/plugins/dayjs'
import '@/shared/composables/registerServiceWorker'

// eslint-disable-next-line no-restricted-imports
import '@/app/assets/styles/index.css'

if (import.meta.env.PROD) {
  document.addEventListener('contextmenu',(e) => { e.preventDefault() },{ passive: false })
}
// Установка интерцептора
setupAxiosInterceptor()

bootstrapStyles({ theme: 'lsDark-1' }).then(async () => {
  await loadStandConfigFromElectron()

  createApp(App)
    .use(createPinia())
    .use(useLocalization().i18n)
    .use(router)
    .use(imPlugin)
    .mount('#app')
})

