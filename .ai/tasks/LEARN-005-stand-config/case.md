# LEARN-005 — Stand config (web)

## Исходная задача

Научить приложение знать адреса RTU/APS стенда через env + Vite proxy (web, без Electron). Это база для auth/API/SIP в следующих LEARN.

## Уточнения пользователя

- Сначала стенд/подключение, UI натягиваем поверх (LEARN-000).
- Планы крупнее.
- Electron stand-config IPC — позже (фаза F9), сейчас только browser + env.

## Ограничения

- Не копировать Electron IPC / `electron-stand-setup` UI.
- Не хардкодить секреты и боевые URL в коде; в git — `.env.example`, локальный `.env.development` в ignore.
- Auth и HTTP-клиент с токеном — следующие LEARN (006/007); здесь достаточно config + proxy + проверка, что URL резолвятся.

## Связанные материалы

- `.reference/src/shared/stand-config/`
- `.reference/vite.config.ts` — proxy RTU/APS
- `.reference/env/.env.development` — имена переменных (не копировать чужие стенды вслепую)
- `.reference/.ai/knowledge/wiki/electron/stand-config.md` — Electron (вне scope)
- `.reference/.ai/knowledge/wiki/backend-integration/api-routing.md`
