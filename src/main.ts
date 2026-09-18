import { createApp } from 'vue'
import './style.css'
import { App } from '@/app'
import { router } from '@/app/router'
import { createPinia } from 'pinia'

createApp(App).use(createPinia()).use(router).mount('#app')
