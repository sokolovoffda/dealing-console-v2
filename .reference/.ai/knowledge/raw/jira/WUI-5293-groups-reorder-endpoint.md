# WUI-5293 — Backend: groups/reorder

Источник: сообщение backend от 2026-07-24.

## Endpoint

```
PUT /api/v1/me/pinned-calls/groups/reorder
```

Зеркало: `/api/v1/users/{userId}/pinned-calls/groups/reorder`

По аналогии со `slots/reorder`.

## Body

```json
{ "fromIndex": 2, "toIndex": 1 }
```

- Поля: `fromIndex` / `toIndex` (не `fromOrder` / `toOrder`).
- Диапазон: `0..7` (ключ группы — `index`).

## Поведение

Меняет местами **содержимое** двух бродкаст-групп:

- `micState`
- `volumeState`
- `members`

Индексы ячеек остаются на месте (swap content, не swap index identity).

## Response

Полный `PinnedCallsPanelDto` (`200`).
