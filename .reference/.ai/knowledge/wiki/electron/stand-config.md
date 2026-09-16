# Electron stand-config (runtime стенд)

## Назначение

Одна Electron-сборка пульта без bake-in адреса стенда: админ задаёт RTU/APS на устройстве, значения живут в `config.json` (`userData`) и в runtime renderer.

Browser / Astra `.deb` не используют этот поток: same-origin + nginx.

## Текущее понимание (часть 1, WUI-5638)

### Хранение

- Файл: `app.getPath('userData')/config.json`
- Поля: `host`, `rtuBaseUrl`, `apsBaseUrl`, `mode: 'optimistic' | 'manual'`
- `host` — ввод пользователя (IP/домен) для optimistic-сценария
- `rtuBaseUrl` / `apsBaseUrl` — реальные origin’ы для REST/WS/auth
- Запись в файл только после **успешного** ping

### IPC (main ↔ preload ↔ renderer)

- `standConfig:get` / `set` / `ping`
- Preload: `window.electronAPI.getStandConfig | setStandConfig | pingStandConfig`
- Ping выполняется в **main** (не renderer), чтобы не упираться в CORS/`file://`

### Ping

- Timeout ~5s на URL
- Optimistic: `http://{host}:3000` (APS) и `http://{host}:6001` (RTU); если http не ответил — `https://` на те же порты
- APS: `GET {origin}/api/health`, успех только если JSON `service === 'dealing-admin'`
- RTU: `GET {origin}/api/user/login`, успех = любой HTTP-ответ; ответ «как APS health» на RTU URL = `failure: 'identity'`
- Manual: полные URL как есть (`http`/`https`, любой порт)
- `failure`: `none` | `rtu` | `aps` | `both` | `identity`

### UI на логине (Electron only)

1. Старт → load config → ping сохранённых URL/host → при ok connected-state (логин разблокирован)
2. Поле адреса + кнопка **«Проверить соединение»** (Enter = то же); blur **не** пингует
3. Успех optimistic → persist `mode: 'optimistic'`, зелёная надпись «Есть соединение с сервером»
4. Fail optimistic → ошибка + автомодалка двух URL **или** ссылка «Указать адреса RTU и APS вручную»
5. В модалке **«Подключить»** → ping manual → persist `mode: 'manual'` → connected
6. Cancel модалки конфиг не пишет
7. «Сменить адрес» пока **без** админ-пароля: сразу снова поле адреса (логин снова locked до ping)

Зелёный статус означает успешный ping **пары `rtuBaseUrl`/`apsBaseUrl`**, а не «подпись» к полю host.

### Runtime URL в renderer

- `shared/stand-config`: `applyStandConfig` / `getRtuBaseUrl` / `getApsBaseUrl`
- `url-helper.getAppURL` → RTU; `getAdditionalApiURL` → APS
- Auth login/logout/refresh/change-password собирают URL **в момент запроса** (не при импорте модуля) — закрывает суть WUI-3541
- Env `VITE_SERVER_ELECTRON` / `VITE_ADDITIONAL_API_URL` — fallback, если runtime пустой

## FSD

- `src/shared/stand-config` — runtime URL + типы
- `src/features/electron-stand-setup` — ping-обёртка, UI логина, manual-модалка
- `electron/stand-config.mjs` — persist + ping в main

## Часть 2 (запланировано, не сделано)

- Смена адреса при живом коннекте только после пароля админа APS
- Ошибка логина → возврат к вводу стенда с различимыми причинами (401 / перепутанные URL / network)

## Связанные страницы

- `ipc.md`
- `preload.md`
- `../backend-integration/api-routing.md`
- `../product/open-questions.md`

## Источники

- `electron/stand-config.mjs`
- `electron/preload.mjs`
- `src/shared/stand-config/`
- `src/features/electron-stand-setup/`
- `src/shared/url-helper/index.ts`
- `src/shared/auth/use-auth.ts`
- `.ai/tasks/WUI-5638/case.md`
- Уточнение пользователя от 2026-09-14

## Открытые вопросы

- Точный APS endpoint «только пароль» для смены адреса — уточнить в части 2
