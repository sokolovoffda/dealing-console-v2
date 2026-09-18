import { bootstrapStyles } from '@wui/common-library'
import { createApp } from 'vue'
import { App } from '@/app'
import { router } from '@/app/router'
import { createPinia } from 'pinia'
import '@/app/assets/styles/index.css'

// Как в rtu-user-web-app: Inter грузится через UI Kit (useFonts), не через Google Fonts вручную
bootstrapStyles({ theme: 'lsDark-1', useFonts: ['Inter'] }).then(() => {
  createApp(App).use(createPinia()).use(router).mount('#app')
})
