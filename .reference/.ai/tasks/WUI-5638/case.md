# WUI-5638 — Реализовать ввод стенда для Electron сборки

## Исходная задача

Jira: [WUI-5638](https://jira.satel.org/browse/WUI-5638)  
Тип: Feature Request · Статус: Анализ · Priority: Medium  
Компонент: Дилинговый пульт  
Fix version: 3.0.0 (dealing-console)

Сейчас адрес стенда для Electron зашивается при сборке (`VITE_SERVER_ELECTRON` / `VITE_ADDITIONAL_API_URL`). Нужна одна Electron-сборка, в которой админ указывает стенд на устройстве.

Связанный известный баг: [WUI-3541](https://jira.satel.org/browse/WUI-3541) — изменение `config.json` не применялось в Electron, потому что URL читался из env на этапе импорта.

Предыдущее обсуждение: [Electron stand address](27be310c-046a-4b8e-9ecc-55a75c253b0a).

## Решение после переговоров (2026-09-11)

- **Без discovery.** Адрес вводится вручную.
- **Только Electron.** Browser / Astra `.deb` не трогаем: там same-origin + nginx.
- На странице логина **три поля**: адрес (IP или домен), логин, пароль.
- Логин и пароль **заблокированы**, пока не прошёл пинг обоих сервисов.
- Оптимистичный сценарий: админ ввёл host → пингуем `{host}:3000` (APS / dealing-admin) и `{host}:6001` (RTU WebAPI).
- После успешного пинга обоих: логин/пароль разблокируются, поле адреса скрывается, показывается надпись «есть соединение с сервером».
- Пока соединение есть: «Сменить адрес» → модалка с паролем админа → запрос на **новый бек (APS)** → при совпадении разрешаем сменить адрес.
- Если соединения нет: поле адреса доступно всегда.
- Введённый адрес сохраняется в **конфиг пульта** (Electron `userData` / `config.json`). При следующем входе читаем, пингуем; если коннект есть — поле адреса не показываем или disable + зелёная надпись.
- **Фолбек:** если один или оба сервиса недоступны на 3000/6001 — модалка «сервисы недоступны, укажите новые значения» с **двумя полными URL**: RTU и APS. Нужно, чтобы можно было ходить на стенды вроде `http://webclientrtudev.satel.org:9996/` и `https://webclientrtustage.satel.org:9999/`.
- Если админ **перепутал стенды местами**: авторизация не проходит → снова ввод данных + возможные причины (неверные учётки / сервисы перепутаны / стенд недоступен).

## Уточнения пользователя

- 2026-09-10: функционал только Electron; RTU и APS считались на одной машине; хранение — конфиг пульта, не bake-in env; смена адреса с логина и из настроек (через новую админку или пароль админа).
- 2026-09-11: discovery **не делаем**.
- 2026-09-11: на логине сразу три поля, а не «сначала только адрес».
- 2026-09-11: оптимистичные порты `3000` (APS) и `6001` (RTU); фолбек — два полных URL.
- 2026-09-11: смена адреса при живом коннекте только после пароля админа на новый бек.
- 2026-09-11: цель проверки — собственные стенды с нестандартными портами/схемами (http:9996, https:9999).
- 2026-09-11: админ-гейт (логин+пароль vs только пароль) — **не в этой части**, позже.
- 2026-09-11: оптимистичный пинг: сначала `http://`, если не ответил — пробовать `https://`.
- 2026-09-11: смена адреса **пока только со страницы логина** (из настроек — не в этом скоупе).
- 2026-09-14: пока **не блокировать** смену адреса админ-паролем — «Сменить адрес» сразу открывает поле; гейт отложить до шага 6 / отдельного решения.
- 2026-09-14 (шаг 5): ссылка «Указать адреса RTU и APS вручную» **всегда**, пока видно поле адреса; плюс автомодалка при fail optimistic ping; Cancel модалки не пишет конфиг.
- 2026-09-14: ping/persist только по явной кнопке «Проверить соединение» (или Enter в поле host) либо по «Подключить» в manual-модалке; blur не пингует.
- 2026-09-14: часть 1 закрываем тестами + wiki по текущей логике; админ-гейт (бывш. шаг 6) и разбор ошибки логина (бывш. шаг 7) — **часть 2 позже** (`implementation_plan_2` при старте).
- 2026-09-11: RTU probe — любой HTTP к `/api/user/login` (не swagger, не чистый TCP).
- 2026-09-11: админ-гейт при смене адреса — **только пароль**, запрос на новую админку (APS). Реализация гейта позже, не в первых шагах.
- 2026-09-11: FSD: `shared/stand-config` + `features/electron-stand-setup` — ок.
- 2026-09-11: RTU probe method — `GET /api/user/login`.

## Как определяем «сервер живой» (ping)

Не «любой 404 = жив» как единственное правило. Два уровня:

1. **Reachability (порт/HTTP отвечает)**  
   Живой = за timeout (~5s) пришёл **любой HTTP-ответ** (200 / 401 / 404 / 405…).  
   Мёртвый = `ECONNREFUSED`, DNS fail, TLS fail без ответа, timeout.  
   Да: в этом смысле 404 уже значит «на порту кто-то говорит HTTP». Нет: это ещё не значит, что это нужный сервис.

2. **Identity (кто ответил)**  
   - **APS (`:3000` / apsBaseUrl):** `GET /api/health` → JSON с `service === 'dealing-admin'`. Это нормальный health, не 404-хак.  
   - **RTU (`:6001` / rtuBaseUrl):** отдельного health нет. Probe: HTTP к `/api/user/login` — любой HTTP-ответ = reachable; ответ, похожий на APS health, = подозрение что URL перепутаны.

Ping делаем из Electron **main** (не renderer), чтобы не упираться в CORS/`file://`.

## Ограничения

- Не менять browser/deb routing (`env/.env.production` остаётся same-origin).
- `getAppURL` / `getAdditionalApiURL` / `use-auth` не должны читать URL **на этапе импорта модуля**; только runtime.
- Ping и запись конфига — через Electron main + IPC (renderer CORS / `file://` не надёжны).
- Публичные контракты IPC diagnostics не ломаем.
- Новых npm-зависимостей без согласования нет.

## Текущее поведение в коде

- Electron REST: `getAppURL` ← `VITE_SERVER_ELECTRON`; additional ← `VITE_ADDITIONAL_API_URL`.
- `use-auth` собирает `DEFAULT_LOGIN_PATH` и остальные auth URL **при импорте**.
- IPC сейчас: diagnostics snapshot + relaunch + network/certificate events. Persist стенда нет.
- APS (dealing-admin) публичные пути: `/api/health` (`service: 'dealing-admin'`), `/api/ready`, `/api/admin/login` (прокси на MOA).

## Предлагаемая FSD-раскладка

- `src/shared/stand-config/` — runtime URL (shared, потому что `url-helper` не может импортировать features).
- `src/features/electron-stand-setup/` — пинг, поля логина, фолбек-модалка, смена адреса, проверка админа.
- `src/pages/login` + `src/widgets/login-form` — композиция UI.
- `electron/stand-config.mjs` + preload IPC.

## Связанные материалы

- Jira: https://jira.satel.org/browse/WUI-5638
- Связанный баг: https://jira.satel.org/browse/WUI-3541
- Admin login на новом беке: `dealing-admin` `POST /api/admin/login` → MOA `/api/admin/login`
- APS health: `GET /api/health` → `{ status: 'ok', service: 'dealing-admin' }`
- Wiki: `backend-integration/api-routing.md`, `electron/preload.md`, `electron/ipc.md`
- Код: `src/shared/url-helper/index.ts`, `src/shared/auth/use-auth.ts`, `src/pages/login/ui/LoginPage.vue`, `electron/electron.js`, `electron/preload.mjs`

## Открытые вопросы

- Блокирующих нет.
- Админ-гейт: только пароль → APS (контракт endpoint уточним, когда дойдём до шага; в этой части можно заготовку UI).
- Когда RTU появится нормальный `/api/health` — можно заменить probe с `/api/user/login` (не сейчас).
