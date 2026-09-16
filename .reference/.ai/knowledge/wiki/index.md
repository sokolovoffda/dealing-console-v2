# Project Wiki Index

## Product

- `product/overview.md` — общее описание продукта.
- `product/glossary.md` — словарь терминов.
- `product/open-questions.md` — открытые вопросы.

## Domain

- `domain/handsets.md` — модель двух трубок footer и статусов линий.
- `domain/calls.md` — модель звонков.
- `domain/pinned-calls.md` — закрепленные вызовы.
- `domain/broadcast-groups.md` — бродкаст-группы (layout REST, move left/right, audio override, VAD).
- `domain/devices.md` — устройства.
- `domain/speakers-ptt.md` — speakers/PTT.
- `domain/conferences.md` — конференции.
- `domain/directory.md` — directory/контакты.
- `domain/statuses.md` — статусы абонентов и UI presence.
- `domain/quick-call-panel.md` — панель быстрого вызова.
- `domain/activity-monitor.md` — монитор активности (верхняя сетка BLF + очередь).

## Frontend

- `frontend/components.md` — правила использования frontend UI-компонентов (в т.ч. TurretCallCard / WUI-5631).
- `frontend/architecture.md` — frontend-архитектура.
- `frontend/routing.md` — routing.
- `frontend/stores.md` — frontend stores и composables.
- `frontend/testing.md` — практики frontend-тестирования.

## Electron

- `electron/electron-overview.md` — Electron overview.
- `electron/preload.md` — preload и `electronAPI`.
- `electron/ipc.md` — IPC-каналы.
- `electron/stand-config.md` — runtime стенд Electron (WUI-5638): config.json, ping, логин UX.

## Backend Integration

- `backend-integration/api-routing.md` — routing REST endpoints между основным и дополнительным backend.
- `backend-integration/sip-webrtc.md` — SIP/WebRTC и BLF/presence.
- `backend-integration/controller-ws.md` — controller websocket.
- `backend-integration/turret-aps-ws.md` — Turret APS websocket для связи Console с Dealing Admin.
- `backend-integration/im-preferences.md` — IM preferences.
- `backend-integration/goose-settings-api.md` — REST goose settings (implemented) + draft line key bindings.
- `backend-integration/media-device-overrides-api.md` — REST media-device-overrides + runtime wire (WUI-5528 plan3/plan4, implemented).

## Decisions

- `decisions/README.md` — архитектурные решения.
