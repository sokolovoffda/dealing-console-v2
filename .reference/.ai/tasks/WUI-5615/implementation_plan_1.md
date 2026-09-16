# Кейс: WUI-5615 — Синхронизация mic/volume при добавлении в группу

## Описание текущей части кейса

Закрыть разрыв: после add/edit members группы runtime mic/volume слотов не подтягиваются к intent группы до первого клика по футеру. Параллельно зафиксировать продуктовое правило взаимодействия «карточка слота ↔ группа» (п.2 Jira) и отразить его в коде/wiki.

## Контекст предыдущих частей

- Связанных `implementation_plan_*` по WUI-5615 нет.
- База: WUI-5293 (`applyGroupAudioToMembers`, overlap OR/max/last-action).

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/broadcast-groups.md`
- `.ai/knowledge/wiki/domain/pinned-calls.md`
- `.ai/knowledge/wiki/domain/speakers-ptt.md`

# План реализации: sync group audio on member add + card↔group rules

## Шаг 1: Зафиксировать правила в wiki (без кода)

- **Описание:** Правила уже согласованы в `case.md` (п.1 store sync всем members; п.2 = A). Перенести в wiki `broadcast-groups.md` / `pinned-calls.md` + `log.md`. Без изменений `src/`.
- **Файлы для изменений:** `.ai/knowledge/wiki/domain/broadcast-groups.md`, `.ai/knowledge/wiki/domain/pinned-calls.md`, `.ai/knowledge/wiki/log.md`
- **Ожидаемый результат:** В wiki явно: sync on membership change → все текущие members; card drift локальный, без reverse-sync intent группы.
- **Проверка:** Ревью текста пользователем.
- **Коммит после шага:** Да (docs/wiki only)
- **Нужно ли обновить project wiki:** Да: `broadcast-groups.md`, `pinned-calls.md`, `log.md`

## Шаг 2: Sync group audio сразу после изменения состава группы

- **Описание:** После успешного `updateGroup` / `addGroupMember` в store вызвать `applyGroupAudioToMembers` с явным `micState` + `volumeState`/`volume` на **всех текущих members**. Пустой patch не использовать. UI-блокировку футера без active session не менять.
- **Файлы для изменений:**
  - `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
  - точечный unit-тест (по согласованию / шаг 3)
- **Ожидаемый результат:** После add/edit состава members сразу в effective состоянии группы (overlap сохранён).
- **Проверка:** unit-тест + ручной сценарий add в группу с mic on / volume mute.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Тесты (по апруву) + проверка п.2 A без лишнего кода

- **Описание:** П.2 A уже в коде (`patchSlotRuntimeAudio` не трогает group intent) — отдельной реализации не требуется, только убедиться регрессией/тестом. По апруву — AAA-тесты на sync-on-membership-change.
- **Файлы для изменений:** `*.test.ts` рядом со store
- **Ожидаемый результат:** Покрыт sync после update/add member; card не меняет group intent.
- **Проверка:** `npm run test` (точечно)
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет
