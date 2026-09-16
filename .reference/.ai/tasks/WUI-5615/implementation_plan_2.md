# Кейс: WUI-5615 — Sync group audio after reload / on session bind

## Описание текущей части кейса

После reload/init слоты получают дефолтный mic/volume, а группы сохраняют intent. При dial→answer с pinned применяется только runtime слота → сессия не как у группы. Нужен sync group→slots после fetch и перед apply audio при bind сессии.

## Контекст предыдущих частей

- `implementation_plan_1.md` — sync при смене состава; card↔group = A; wiki + тесты membership.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/broadcast-groups.md`
- `.ai/knowledge/wiki/domain/pinned-calls.md`

# План реализации: sync group audio on fetch / session assign

## Шаг 1: Sync после fetchPanel + при assignSessionToSlot

- **Описание:** После загрузки panel — `syncAllGroupsAudioToMembers`. В `assignSessionToSlot` перед `applySlotAudioState` — выровнять этот слот под группы (если состоит в группе). Обновить wiki + тесты.
- **Файлы:** `use-pinned-calls-panel-store.ts`, wiki, `sync-group-audio-on-membership.test.ts` (или рядом)
- **Ожидаемый результат:** После reload карточки/слоты как у группы; dial→answer применяет group intent.
- **Проверка:** unit-тесты + ручной dial из pinned
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да
