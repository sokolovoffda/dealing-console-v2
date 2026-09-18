# LEARN-006 — Auth flow

## Часть плана

Один крупный шаг: страница логина → POST `/api/user/login` → сохранить сессию → guard. HTTP-клиент с авто-header — следующий LEARN.

---

## Шаг 1: Login + session + router guard

- **Зачем:** без авторизации дальше API/SIP на стенде не открыть.
- **Фокус обучения:** Pinia (или тонкий auth API), Vue Router `beforeEach`, FSD (`pages/login`, `shared`/`entities` auth).
- **Референс:** `.reference/src/shared/auth/use-auth.ts`, `beforeEachHook.ts`, login page — сильно упростить.
- **Сделать:**

  1. **Страница** `pages/login` (слайс + public API): форма логин/пароль (WuiInput / обычный input + `WuiBtn`), ошибка текстом по-русски.
  2. **Роут** `/login` (`name: 'login'`). Остальные роуты (`home`, `about`, …) — «защищённые».
  3. **Auth state** — на выбор (предпочтительнее Pinia setup-store в `shared/auth` или `entities/session`):
     - `accessToken`, `refreshToken` (если приходит), `user` (упрощённый тип: id/name/internalNumber — что реально вернёт стенд)
     - `login(username, password)`, `logout()`, `isAuthenticated` (getter)
     - persist: `localStorage` ключи вроде `access_token` / `auth_user` (как в референсе) + restore при старте
  4. **Запрос логина** (пока `fetch`, без axios):
     ```ts
     // web + proxy: относительный путь
     const res = await fetch('/api/user/login', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ login: username, password }), // поля сверь с ответом/референсом!
     })
     ```
     Имена полей тела/ответа **обязательно сверь** с `.reference/src/shared/auth/use-auth.ts` и реальным 401/200 на стенде (в проде может быть `username`/`login` — не угадывай).
  5. **Guard** в `app/router`:
     - нет сессии и не `/login` → redirect `login`
     - есть сессия и идёт на `/login` → redirect `home`
  6. На `Home` (или в nav): кнопка «Выйти» + кратко показать имя/номер пользователя.
  7. Debug `fetch`/`console.log` proxy с LEARN-005 убрать, если ещё остались.

- **Подсказки:**
  1. Порядок в `main.ts` уже верный: Pinia → Router; guard использует store → Pinia должна быть установлена до первого navigation (обычно ок, если `use(pinia)` до `use(router)` и mount).
  2. В guard не делай тяжёлую логику; только проверка токена/user.
  3. `UserInfo` из `@wui/common-library` можно взять тип, если подходит; иначе свой узкий `type AuthUser = { ... }`.
  4. Учётку стенда вводи руками в форме, не в `.env`.

- **Критерий готовности:** без логина `/` кидает на `/login`; успешный логин → home; refresh страницы сессия жива; logout чистит storage и снова login; в Network POST `/api/user/login` → 200.
- **Проверка:** `npm run ts:check` && `npm run lint` && ручной сценарий на стенде.
- **Кто пишет код:** ты (подсказки в чате по запросу).
- **Коммит:** да  
  Ориентир: `feat: add login page, auth session and route guard`

---

## Что не делаем здесь

- Axios + interceptor Authorization / refresh queue → **LEARN-007**
- SIP → **LEARN-008+**
- Electron stand UI на логине → позже

## После LEARN-006

`старт LEARN-007-api-client` (или склеить с куском «профильный GET», если скажешь).

---

## Перед стартом кода

Если LEARN-005 ещё не закоммичен — закоммить (без `env/.env.development`). Затем `одобряю` / `начинай` по этому плану.
