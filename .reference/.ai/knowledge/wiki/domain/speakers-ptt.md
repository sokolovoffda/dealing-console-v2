# Speakers / PTT (Goose)

## Назначение

Страница фиксирует режимы микрофона Goose и правила PTT для завешенных линий (новая panel-модель WUI-5185).

## Текущее понимание

Настройки Goose живут в `devices-store` (`preferredGooseId`, `gooseMode`, `goosePttScope`), UI — Media Devices. Persist: REST `GET/PUT /api/v1/me/goose-settings` через `useGooseSettingsStore` (hydrate при load preferences; dirty → PUT на leave Settings / logout). `localStorage` `dealing-console:goose-settings` не используется.

Режимы:

- `stateful` — speak переключает mic (toggle).
- `pushToTalk` + `standard` — mic только пока speak нажат; действует на все pinned-линии на выбранном goose (с учётом `slot.micState`).
- `pushToTalk` + `activePinned` — mic только пока speak нажат и **только для активного слота** новой панели (`activeSlotOrder`).

Runtime goose для pinned/footer — `readyPreferredGoose` (не первый из списка; **исключает** `enabled=false` / not-ready). Soft-disable goose при bound pinned sessions → блок+toast (см. `devices.md`).

## PTT activePinned (WUI-3825)

Источник истины: `usePinnedCallsPanelStore`, не legacy `usePinnedCallsStore.activePinnedCall`.

На speak press:

1. `startActivePinnedPushToTalkOverride()` фиксирует `activeSlotOrder` на момент нажатия (`null`, если слот не выбран).
2. Включается глобальный goose mic + `applyGooseMicToPanelSessions()`.
3. Unmute только слота с зафиксированным order; остальные mute.
4. Если активный слот не выбран — notification `SelectActivePinnedLineForPushToTalk`, все линии mute.

На speak release:

1. Visual speak OFF.
2. `stopActivePinnedPushToTalkOverride()`.
3. Все panel-сессии на goose снова mute.

Гарантии WUI-3825:

- Смена активного слота **без** press speak не включает mic.
- При удержании speak в `activePinned` смена `activeSlotOrder` (очередь call card, клик по слоту на сетке) **переносит** передачу на новый active слот.
- Выбранная сессия в очереди pinned presentation (`pinnedPresentationSessionId`) синхронизирует `activeSlotOrder` на сетке.
- UI toggle mic линии / call card mute в режиме `activePinned` PTT заблокированы — обход аппаратной speak запрещён.

## Основные сущности

- `preferredGoose` / `readyPreferredGoose` — выбранный goose.
- `gooseMode`: `stateful` | `pushToTalk`.
- `goosePttScope`: `standard` | `activePinned`.
- `activePinnedPushToTalkTargetOrder` — override в panel store.

## Связанные страницы

- `devices.md`
- `pinned-calls.md`
- `../backend-integration/goose-settings-api.md`

## Источники

- `.ai/tasks/WUI-5185/case.md` (часть 3)
- `.ai/tasks/WUI-5185/implementation_plan_4.md`
- `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
- `src/shared/controller/event-handlers/gooseEventHandler.ts`
- `src/shared/composables/state/devices-store/use-devices-store.ts`
- `src/entities/media-devices-settings/model/use-goose-settings-store.ts`
- Уточнение пользователя / ревью Mitrichev (WUI-3825) в рамках WUI-5185

## Открытые вопросы

- Line key bindings на backend API — draft: `../backend-integration/goose-settings-api.md`.
- Нужен ли отдельный UI-индикатор «PTT active на слоте X» помимо LED speak.
