# Electron IPC

## Назначение

Каталог IPC-каналов между Electron main и renderer (через preload).

## Текущее понимание

### Stand config (WUI-5638)

| Channel | Direction | Назначение |
|---|---|---|
| `standConfig:get` | renderer → main | Прочитать `userData/config.json` |
| `standConfig:set` | renderer → main | Записать нормализованный stand config |
| `standConfig:ping` | renderer → main | Ping APS+RTU (optimistic host или manual URLs) |

Payload `set`: `{ host, rtuBaseUrl, apsBaseUrl, mode }`. Пустой payload → ошибка (отдельного clear-канала нет; сброс = удалить файл).

Ping request: `{ host }` **или** `{ rtuBaseUrl, apsBaseUrl }` (оба URL обязательны в manual).

Подробности контракта и UX: `stand-config.md`.

### Diagnostics / прочее

Исторически в приложении также есть IPC диагностики, relaunch, network/certificate events. При изменении не ломать публичные контракты diagnostics.

## Связанные страницы

- `stand-config.md`
- `preload.md`
- `electron-overview.md`

## Источники

- `electron/stand-config.mjs`
- `electron/preload.mjs`
- `src/env.d.ts`
- `.ai/tasks/WUI-5638/case.md`

## Открытые вопросы

- Нужен ли явный IPC `standConfig:clear` для сброса без удаления файла вручную
