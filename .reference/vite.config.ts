
import * as path from 'path'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { ConfigEnv, ProxyOptions, UserConfig, defineConfig, loadEnv } from 'vite'
import { ManifestOptions, VitePWA } from 'vite-plugin-pwa'
import VueDevTools from 'vite-plugin-vue-devtools'
import zipPack from 'vite-plugin-zip-pack'

import manifest from './manifest.json'
import { version } from './package.json'
import { generateThemeCssPlugin } from './scripts/generate-theme-css-plugin.mjs'
import { normalizeBaseUrl } from './src/shared/url-helper/normalizeBaseUrl'

const ENV_DIR = './env'
const VITE_PORT = 5558

const createProxyEntry = (target: string, ws = false): ProxyOptions => ({
  target,
  changeOrigin: true,
  secure: false,
  ws,
})

const createServerProxy = (
  target?: string,
  additionalTarget?: string,
): Record<string, string | ProxyOptions> | undefined => {
  if (!target && !additionalTarget) {
    return undefined
  }

  return {
    ...(additionalTarget
      ? {
        '/api/v1/me/fast-dial': createProxyEntry(additionalTarget),
        '/api/v1/me/snapshots': createProxyEntry(additionalTarget),
        '/api/v1/me/pinned-calls': createProxyEntry(additionalTarget),
        '/api/v1/me/main-settings': createProxyEntry(additionalTarget),
        '/api/v1/me/goose-settings': createProxyEntry(additionalTarget),
        '/api/v1/me/media-device-overrides': createProxyEntry(additionalTarget),
        '/api/v1/me/activity-monitor': createProxyEntry(additionalTarget),
        '/api/v1/me/diagnostics': createProxyEntry(additionalTarget),
        '/ws/turret': createProxyEntry(additionalTarget, true),
      }
      : {}),
    ...(target
      ? {
        '/api': createProxyEntry(target),
        '/selector': createProxyEntry(target),
        '/im': createProxyEntry(target, true),
        '/prompt': createProxyEntry(target, true),
        '/sip': createProxyEntry(target, true),
      }
      : {}),
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const env = loadEnv(mode, path.resolve(__dirname, ENV_DIR), '')
  console.log(mode, path.resolve(__dirname, ENV_DIR))
  const isDevelopment = /development/.test(mode)
  const isStage = /stage/.test(mode)
  const isProduction = !isDevelopment && !isStage
  const target = normalizeBaseUrl(env.VITE_API_DEV_SERVER)
  const additionalTarget = normalizeBaseUrl(env.VITE_ADDITIONAL_API_URL)
  const isElectron = () => process.env.ELECTRON === 'true' || env.VITE_ELECTRON === 'true'

  if (isElectron()) {
    console.log('isElectron', isElectron())
  }
  if (isProduction) {
    console.log('isProduction', isProduction)
  }
  console.log('VITE_API_DEV_SERVER', target)
  console.log('VITE_ADDITIONAL_API_URL', additionalTarget)

  return {
    base: isElectron() ? './' : '/',
    envDir: ENV_DIR,
    envPrefix: [ 'VITE_' ],
    plugins: [
      generateThemeCssPlugin(),
      tailwindcss(),
      vue(),
      VueDevTools(),
      VitePWA({
        includeAssets: [ 'favicon.ico', 'robots.txt', '/img/icons/apple-touch-icon.png' ],
        injectManifest: {
          maximumFileSizeToCacheInBytes: 1024 * 1024 * 3,
        },
        manifest: manifest as Partial<ManifestOptions>,
        strategies: 'injectManifest',
        injectRegister: 'script',
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      zipPack({
        outFileName: `${version}-${mode}.zip`,
      }),
    ],
    resolve: {
      alias: {
        '@/': `${path.resolve(__dirname, 'src')}/`,
      },
    },
    build: {
      minify: false,
      sourcemap: true,
      target: 'es2022',
    },
    esbuild: {
      target: 'es2022',
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2022',
      },
    },
    server: {
      port: VITE_PORT,
      proxy: createServerProxy(target, additionalTarget),
    },
  }
})
