# LEARN-006 — Auth flow (учебный минимум)

## Исходная задача

Логин на RTU через proxy, хранение токена/пользователя, guard роутов: без сессии → `/login`, с сессией → защищённый `/`. Упрощённо как в проде, без Electron и без полного axios-слоя (перехватчики — LEARN-007).

## Уточнения пользователя

- Планы крупнее.
- Код пишет разработчик; подсказки агента — в чате кусками, в файлы — только по явной просьбе.
- Стенд уже: env + proxy + `shared/stand-config` (LEARN-005).

## Ограничения

- Не копировать целиком `AuthManager` / event bus из `.reference/src/shared/auth/use-auth.ts` — взять идею, упростить (Pinia store или тонкий composable).
- Не тащить change-password, Electron listeners, полный refresh-flow (refresh можно заглушкой или минимально).
- Пароли/токены не коммитить; в UI — обычная форма, без хардкода учётки в репо.
- Axios interceptors → **LEARN-007** (логин можно на `fetch`).

## Связанные материалы

- `.reference/src/shared/auth/use-auth.ts`
- `.reference/src/app/router/beforeEachHook.ts`
- `.reference/src/pages/login/`
- LEARN-005: `env/`, proxy `/api`, `getStandConfigSnapshot`
