import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

const ENV_DIR = './env'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ENV_DIR, 'VITE_')

  const rtuTarget = env.VITE_API_DEV_SERVER
  // const apsTarget = env.VITE_ADDITIONAL_API_URL

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
      proxy: {
        ...(rtuTarget
          ? {
              '/api': {
                target: rtuTarget,
                changeOrigin: true,
                secure: false,
              },
            }
          : {}),
      },
    },
  }
})
