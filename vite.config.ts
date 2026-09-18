import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

const ENV_DIR = './env'

const createProxyEntry = (target: string): ProxyOptions => ({
  target,
  changeOrigin: true,
  secure: false,
})

const createServerProxy = (
  target: string,
  additionalTarget: string,
): Record<string, string | ProxyOptions> | undefined => {
  if (!target && !additionalTarget) return

  return {
    ...(additionalTarget
      ? {
          '/api/v1/me/fast-dial': createProxyEntry(additionalTarget),
        }
      : {}),
    ...(target
      ? {
          '/api': createProxyEntry(target),
        }
      : {}),
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ENV_DIR, 'VITE_')

  const rtuTarget = env.VITE_API_DEV_SERVER
  const apsTarget = env.VITE_ADDITIONAL_API_URL

  return {
    envDir: './env',
    plugins: [vue(), vueDevTools(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5559,
      proxy: createServerProxy(rtuTarget, apsTarget),
    },
  }
})
