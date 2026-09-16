# WUI-5032 — Dealing APS: подключение, send/receive

## Исходная задача

Dealing Console должен держать постоянный WS к Dealing Admin (`/ws/turret`): lifecycle сессии, стадии, исходящие audit/диагностика, позже — входящие admin-команды.

Документация: `dealing-admin/docs/dealing-console-ui-turret-ws-tasks.md`, `dealing-admin/docs/turret-aps.md`.

## Уточнения пользователя

- Часть 1 (CON-WS-1 + база CON-WS-2) уже в коде: Hello/Upgrade/heartbeat/reconnect, стадии AUTHENTICATED → CONTROLLER_ONLINE → READY.
- 2026-08-13: доработан CON-WS-2 — logout → `CONNECTED_UNAUTH` без закрытия WS; `READY` только при mac+serial; offline sods → `AUTHENTICATED`; `hardwareSerial` = hub.`serial`, fallback на `mcu_uuid` если `UNKNOWN`.
- `capabilities` (п.2 DoD WS-2) — позже.
- Следующая часть: **CON-WS-3** — audit исходящих wire-команд Console → hardware через `ControllerCommandLogged`.
- Входящие `hardware_to_console` — не в текущем scope (phase 2 по доке).
- 2026-08-13: CON-WS-3 (`ControllerCommandLogged`) уже в работе на `feature/WUI-5032-p2`. Следующая часть этой же ветки — сбор диагностики по Admin→Console `CollectDiagnosticsRequested` (это не CON-WS-4 `DebugSnapshot`). Кнопка upload пользователю не нужна. Делаем все `kind`: `har` | `snapshot` | `archive`. В web тоже отправляем хотя бы renderer-данные. Ошибку POST пока не репортим по WS, только помечаем в логе.
- CON-WS-4 (`DebugCollectRequested` / `DebugSnapshot`) — позже.

## Ограничения

- Протокол sods не менять.
- Не ломать отправку на контроллер, если Turret APS WS недоступен (fire-and-forget).
- Не смешивать Turret APS WS и локальный controller WS `ws://127.0.0.1:8765`.
- Минимальные точечные правки; без лишних абстракций.

## Связанные материалы

- `.ai/knowledge/wiki/backend-integration/turret-aps-ws.md`
- `src/shared/turret-admin-ws/useTurretAdminWs.ts`
- `src/shared/controller/useController.ts`
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/docs/dealing-console-ui-turret-ws-tasks.md` (CON-WS-3)
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/schemas/turret.ts` (`ControllerCommandLoggedPayloadSchema`)
- Ранее: `.ai/tasks/WUI-4443/` (первая интеграция Turret APS)
