# Учебный MVP — dealing-console-v2

Статус: согласовано с владельцем (2026-09-16), детализация в LEARN-000.

## Цель

Рабочая звонковая часть пульта на стеке как у production. Параллельно — закрепление **Vue 3**, **TypeScript**, **Pinia** и **FSD**. Код в основном пишет разработчик; агент — планы, ревью, код по просьбе.

## В scope

- Чистый Vite + FSD-скелет руками (не клон репозитория референса).
- Подключение к RTU / APS и SIP/WebRTC **раньше UI** (сначала стенд, потом натягивание интерфейса).
- Auth/config — как в проде, упрощённо.
- Call card / call manager: ключевые состояния, mute / hold / speaker.
- Завешенные: ближе к проду + выбор audio-устройства (web MediaDevices).
- ПБВ: две волны — (1) группы + сетка + звонок + контекстное меню; (2) layout/переносы. Общее контекстное меню в `shared`.
- Настройки: список устройств и выбор устройства для завешенных.
- UI-тексты на русском **без i18n**.

## Вне scope (пока)

- Полный паритет dealing-console-ui (Activity Monitor, broadcast, полный settings и т.п.).
- Electron, controller WS, Goose/Handset.
- Vitest / coverage.
- vue-i18n и мультиязычность.
- Документация диплома.

## Референс

- Код: `.reference/src/`
- Домен и интеграции (read-only): `.reference/.ai/knowledge/wiki/`

## Фазы (LEARN-000)

| Фаза | Содержание | Дочерние LEARN (ориентир) |
|------|------------|---------------------------|
| F0 | Scaffold + FSD + WUI (без i18n) | 001–004 |
| F1 | Config, auth, API стенда | 005–007 |
| F2 | SIP/WebRTC + call-session + core controls | 008–010 |
| F3 | Layout shell + shared context-menu | 011–012 |
| F4 | Call card / call manager | 013–015 |
| F5 | Завешенные + media devices | 016–019 |
| F6 | Contacts / directory | 020–021 |
| F7 | ПБВ: волна 1 (группы/сетка/звонок/меню), затем волна 2 (layout/переносы) | 022–027 |
| F8 | Settings (устройства) | 028 |
| F9–F10 | Electron; тесты | позже |

Детали и зависимости: `.ai/tasks/LEARN-000-app-roadmap/implementation_plan_1.md`.

## ПБВ — две волны

1. **Волна 1:** группы + сетка + звонок + контекстное меню (LEARN-022…025).
2. **Волна 2:** layout/fast-dial/DnD + перенос между группами (LEARN-026…027) — после волны 1.
