# LEARN-005 — Stand config (web)

## Часть плана

Один крупный шаг: env → `shared/stand-config` → Vite proxy → видно в UI, что RTU/APS заданы. Без Electron и без полного auth.

---

## Шаг 1: Env, stand-config, proxy

- **Зачем:** все следующие запросы (логин, API, SIP) должны брать base URL из одного места, а в dev браузер ходить через proxy (CORS).
- **Фокус обучения:** TS (типы env), FSD (`shared`), Vite `loadEnv` / proxy.
- **Референс:** `.reference/src/shared/stand-config/`, `.reference/vite.config.ts` (proxy), `.reference/env/` — упростить под web-only.
- **Сделать:**

  1. **Env**
     - папка `env/` (как в референсе) **или** корневые файлы — выбери один стиль; удобнее как в референсе: `envDir: './env'`.
     - `env/.env.example` (в git):
       ```env
       VITE_ENVIRONMENT_NAME=Development
       # RTU (основной API) — target для proxy /api
       VITE_API_DEV_SERVER=https://your-rtu-host/
       # APS (доп. API)
       VITE_ADDITIONAL_API_URL=http://your-aps-host/
       ```
     - `env/.env.development` — твои реальные URL стенда (**не коммитить**).
     - `.gitignore`: `env/.env`, `env/.env.development`, `env/.env.*.local` (example оставить).

  2. **Типы env** — `src/vite-env.d.ts` или расширить существующий:
     ```ts
     interface ImportMetaEnv {
       readonly VITE_ENVIRONMENT_NAME?: string
       readonly VITE_API_DEV_SERVER?: string
       readonly VITE_ADDITIONAL_API_URL?: string
     }
     ```

  3. **`shared/stand-config` (учебный минимум)**
     - `src/shared/stand-config/types.ts` — простой тип, например `{ rtuBaseUrl?: string; apsBaseUrl?: string }`
     - `getRtuBaseUrl()` / `getApsBaseUrl()` — из `import.meta.env` (+ маленький `normalizeBaseUrl`: trim, без хвостового `/` по желанию)
     - `getStandConfigSnapshot()` — объект для отладки/UI
     - public API через `src/shared/stand-config/index.ts` и реэкспорт из `src/shared/index.ts` (или импорт `@/shared/stand-config`)
     - **Не** делать `loadStandConfigFromElectron` сейчас.

  4. **Vite proxy** в `vite.config.ts`:
     - `envDir: './env'`
     - `loadEnv(mode, envDir, 'VITE_')`
     - `server.proxy`:
       - `/api` → `VITE_API_DEV_SERVER` (RTU), `changeOrigin: true`, `secure: false`
       - по желанию сразу несколько APS-префиксов (как в референсе), минимум один-два, например `/api/v1/me/fast-dial` → APS — **или** пока только RTU `/api`, APS добавишь в LEARN-007, когда понадобится
     - Порт оставь свой (5559).

  5. **Проверка в UI** — на `HomePage` (временно) вывести:
     - `VITE_ENVIRONMENT_NAME`
     - `getRtuBaseUrl()` / `getApsBaseUrl()`
     - подпись: «в браузере запросы пойдут на `/api` через proxy»
     - без секретов.

- **Подсказки:**
  1. В web-режиме референса `getAppURL` часто возвращает **относительный** `pathName` (`/api/...`), а proxy подменяет origin. Для учебного config достаточно уметь **прочитать** абсолютные URL из env (для отладки и будущего Electron) и поднять proxy.
  2. `normalizeBaseUrl` можно скопировать/упростить из `.reference/src/shared/url-helper/normalizeBaseUrl.ts`.
  3. После смены env — перезапуск `npm run dev` обязателен.
  4. Не клади пароли стенда в `.env*` — только host/URL.

- **Критерий готовности:** Home показывает RTU/APS из твоего `.env.development`; Vite стартует с proxy; в Network при ручном `fetch('/api/...')` уходит на стенд (можно даже 401 — главное не CORS на чужой origin).
- **Проверка:** `npm run ts:check` && `npm run lint` && `npm run dev`; в DevTools → Network.
- **Кто пишет код:** ты
- **Коммит после шага:** да (без `env/.env.development`)  
  Ориентир: `feat: add stand env config and Vite API proxy`

---

## Шаг 2 (опционально): wiki

- Файл: `.ai/knowledge/wiki/backend-integration/stand-config-web.md` (или `frontend/stand-config.md`)
- Содержание: web-only env + proxy; Electron — позже; имена `VITE_*`; FSD-путь модуля.
- Могу написать по твоей просьбе после шага 1.

---

## Что не делаем

- Electron IPC / ping UI → позже  
- Login / token → **LEARN-006**  
- Axios/interceptors → **LEARN-007** (можно склеить с 006, если скажешь)

## После LEARN-005

`старт LEARN-006-auth-flow` (или укрупнённый «auth + api client», если захочешь один LEARN).
