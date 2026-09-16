# Кейс: WUI-5638 — Ввод стенда для Electron

## Описание текущей части кейса

**Часть 1 (сейчас):** Electron-only ввод стенда на логине — IPC persist/ping, runtime URL, optimistic host + кнопка «Проверить соединение», manual-модалка двух URL, смена адреса без админ-гейта. Дальше в этой части — только тесты и wiki по уже сделанной логике.

**Часть 2 (позже, отдельный план):** админ-гейт на смену адреса (APS) и обработка ошибки логина с возвратом к вводу стенда. См. низ файла / будущий `implementation_plan_2.md`.

## Контекст предыдущих частей

- Обсуждение UX/discovery: чат [Electron stand address](27be310c-046a-4b8e-9ecc-55a75c253b0a). Discovery отвергнут 2026-09-11.
- 2026-09-14: логики шагов 1–5 достаточно; админ-гейт и доработки ошибок логина отложены; закрываем часть 1 тестами + wiki.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/backend-integration/api-routing.md`
- `.ai/knowledge/wiki/electron/preload.md`
- `.ai/knowledge/wiki/electron/ipc.md`
- `.ai/knowledge/wiki/frontend/architecture.md`

# План реализации (часть 1): runtime-стенд на логине Electron

Перед шагом 1: ветка `feature/WUI-5638` от `release/3.0.0`.

Зафиксировано по пингу:

- Ping из **main process** (IPC), timeout ~5s на каждый URL.
- Оптимистично: `http://{host}:3000` и `http://{host}:6001`; если http не ответил — пробовать `https://` на те же порты.
- **APS:** `GET {origin}/api/health`, успех только если JSON `service === 'dealing-admin'`.
- **RTU:** `GET {origin}/api/user/login`; успех = любой HTTP-ответ в timeout; fail = network/timeout. Ответ с APS health на RTU-URL = ошибка identity (перепутаны).
- Фолбек принимает полные URL как есть (`http`/`https`, любой порт).
- Persist/ping только по явной кнопке «Проверить соединение» (или Enter) либо «Подключить» в manual-модалке; blur не пингует.
- «Сменить адрес» пока без админ-пароля (открывает поле адреса сразу).

FSD: `shared/stand-config` + `features/electron-stand-setup`.

## Шаг 1: Persist стенда в Electron config + IPC — ✅ сделано

- **Описание:** Файл `config.json` в `app.getPath('userData')`. IPC `standConfig:get` / `standConfig:set`. Контракт: `host`, `rtuBaseUrl`, `apsBaseUrl`, `mode: 'optimistic' | 'manual'`. Preload + типы `ElectronAPI`.
- **Коммит после шага:** Да

## Шаг 2: Runtime URL вместо bake-in env — ✅ сделано

- **Описание:** `getAppURL` / additional API / WS читают runtime stand-config. Auth-пути собираются в момент запроса. Env — fallback.
- **Коммит после шага:** Да

## Шаг 3: Ping IPC (optimistic 3000/6001 + manual URLs) — ✅ сделано

- **Описание:** `standConfig:ping` по `{ host }` или `{ rtuBaseUrl, apsBaseUrl }`. Ошибки: rtu/aps/both/identity.
- **Коммит после шага:** Да

## Шаг 4: Поля логина Electron — optimistic UX — ✅ сделано

- **Описание:** Electron: поле адреса, логин/пароль disabled до успешного пинга; кнопка «Проверить соединение»; после успеха — зелёный статус и «Сменить адрес» (без админ-гейта).
- **Коммит после шага:** Да

## Шаг 5: Фолбек-модалка двух полных URL — ✅ сделано

- **Описание:** Ссылка «Указать адреса RTU и APS вручную» + автомодалка при fail optimistic; Cancel не пишет конфиг.
- **Коммит после шага:** Да

## Шаг 6: Тесты + wiki (по текущей логике части 1) — ✅ сделано

- **Описание:** Unit на нормализацию/разбор ping-результата (где вынесено в тестируемый код), runtime `getRtuBaseUrl` / `getApsBaseUrl` / влияние на `getAppURL`, маппинг failure→i18n key. Без SIP, без UI E2E. Wiki: `electron/stand-config.md`, обновить `api-routing.md`, `electron/ipc.md`, `electron/preload.md`, `index.md`, `log.md`. Админ-гейт и сценарий ошибки логина в wiki — как «запланировано / часть 2», не как сделанное поведение.
- **Файлы для изменений:** `src/shared/stand-config/test/*`, `src/features/electron-stand-setup/test/*`, `electron/stand-config.mjs` (export pure helpers), `.ai/knowledge/wiki/*`
- **Ожидаемый результат:** Контракт части 1 покрыт AAA-тестами; wiki описывает Electron-only стенд, IPC, optimistic/manual, кнопку проверки, фолбек-модалку.
- **Проверка:** `npx vitest run` по новым тестам; `npm run ts:check`
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: `electron/stand-config.md`, `electron/ipc.md`, `electron/preload.md`, `backend-integration/api-routing.md`, `index.md`, `log.md`

---

# Часть 2 (позже) — не делаем в этом плане

Вынести в `implementation_plan_2.md` при старте второй части.

## Бывший шаг 6 → часть 2: Смена адреса под админ-паролем (APS)

- Пока коннект есть — «Сменить адрес» → модалка только с паролем → APS. Без пароля живой стенд не меняем. Мёртвый — можно сразу (как сейчас).

## Бывший шаг 7 → часть 2: Ошибка логина → снова ввод стенда с причинами

- Неуспешный login в Electron: вернуть UI на ввод стенда / объяснить 401 vs чужой сервис vs network / перепутанные RTU/APS.

## Бывший шаг 8

- Содержимое (тесты + wiki) перенесено в **шаг 6 части 1** выше; для части 2 при необходимости добавить точечные тесты/wiki-дополнения по админ-гейту и ошибкам логина.
