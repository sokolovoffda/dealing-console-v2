import { bootstrapStyles } from '@wui/common-library'
import { createApp } from 'vue'
import { App } from '@/app'
import { router } from '@/app/router'
import { createPinia } from 'pinia'
import '@/app/assets/styles/index.css'

bootstrapStyles({ theme: 'lsDark-1' }).then(() => {
  createApp(App).use(createPinia()).use(router).mount('#app')
})
