# Кейс: WUI-5032 — CON-WS-3 ControllerCommandLogged

## Описание текущей части кейса

Audit: каждая исходящая wire-команда Console → sods дублируется в Dealing Admin как `ControllerCommandLogged`, без изменения протокола контроллера. Входящие `hardware_to_console` — не в этом плане.

## Контекст предыдущих частей

- WUI-4443 / часть 1 WUI-5032 — WS lifecycle + FSM стадий.
- 2026-08-13 — доработки CON-WS-2 (logout, READY, serial fallback, sods offline).

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/backend-integration/turret-aps-ws.md`
- `.ai/knowledge/wiki/backend-integration/controller-ws.md` (пока пустая)

## Согласованный дизайн (обсуждение)

### Как работает

```text
UI / useController helpers
        │
        ▼
_send / sendControllerCommand  ──► sods ws://127.0.0.1:8765
        │
        └─ (после успешной отправки) ──► Turret APS ControllerCommandLogged
```

### Точка перехвата

Сейчас два почти одинаковых пути: `_send` и `sendControllerCommand`. В плане — **одна** внутренняя отправка на sods + вызов audit; оба публичных пути сходятся туда. Иначе часть команд (brightness/effect через `_send`) или get/netinfo (через `sendControllerCommand`) пропадёт из audit.

### Что уходит в Admin

По схеме Admin (`ControllerCommandLoggedPayloadSchema`):

| Поле | Источник |
|------|----------|
| `wireModel` | `data.model` (например `command`, `register`) |
| `wireName` | `data.name` (например `brightness`, `effect`, `register`) |
| `wirePayload` | остаток wire-объекта без `model`/`name` (attrs, target, uid, …) |
| `direction` | всегда `console_to_hardware` |
| `correlationId` | `data.uid`, если это валидный UUID; иначе не слать (Admin сам сгенерит) |

### Что логируем

- Все исходящие объекты с непустыми `model` + `name` (включая `register`, `get` sysinfo, LED, melody, tone).
- Если Turret APS WS не `OPEN` — команда на sods уходит как обычно, audit пропускается (без throw).
- Невалидный/необъектный payload — не логируем, sods-отправку не блокируем.

### Вне scope

- `direction: hardware_to_console` (входящие `event` от железа).
- Фильтрация «шумных» команд (`play_tone`) — пока не фильтруем; если audit зальёт, вынесем отдельно.
- CON-WS-4 / WS-5 / `capabilities`.

# План реализации: CON-WS-3 audit

## Шаг 1: API отправки ControllerCommandLogged в turret-admin-ws

- **Описание:** Добавить `sendControllerCommandLogged(payload)` в `useTurretAdminWs` (через уже существующий `buildTurretAdminWsMessage` + `send`). Экспорт из public API при необходимости.
- **Файлы для изменений:**
  - `src/shared/turret-admin-ws/useTurretAdminWs.ts`
  - `src/shared/turret-admin-ws/useTurretAdminWs.test.ts` (отправка сообщения / no-op если сокет закрыт)
- **Ожидаемый результат:** Из composable можно отправить typed `ControllerCommandLogged`; при закрытом WS метод возвращает `false`.
- **Проверка:** `npx vitest run src/shared/turret-admin-ws/useTurretAdminWs.test.ts`
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: Перехват исходящих команд в useController

- **Описание:** Свести `_send` и `sendControllerCommand` к общей отправке на sods; после успешного `websocket.send` маппить wire → `ControllerCommandLogged` и вызывать Turret APS. Не менять публичные сигнатуры контроллера.
- **Файлы для изменений:**
  - `src/shared/controller/useController.ts`
- **Ожидаемый результат:** Любая исходящая команда с `model`+`name` (brightness, effect, animation, get, register, play_*) при живом Turret WS попадает в Admin audit; при мёртвом Turret — sods работает как раньше.
- **Проверка:** Ручная: включить Console + Admin `/admin/turret` (или audit), дернуть яркость/LED/get modules — в `audit_entries` появляются `ControllerCommandLogged`. Unit на маппинг — если вынесем маленький helper в тот же слайс; иначе только ручная + шаг 1 тесты.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: `backend-integration/turret-aps-ws.md` + запись в `log.md`

## Шаг 3 (опционально, по апруву): unit на маппинг wire → payload

- **Описание:** Если в шаге 2 появится чистая функция маппинга — покрыть AAA-тестами (register, brightness, отсутствие model/name).
- **Файлы для изменений:** тест рядом с helper / controller
- **Ожидаемый результат:** Регрессия маппинга ловится автотестом.
- **Проверка:** vitest по затронутому файлу
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет
