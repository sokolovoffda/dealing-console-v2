# Завешенные линии

## Назначение

Завешенные линии дают пользователю постоянную раскладку абонентов/вызовов на монопольной странице. Раскладка хранится на backend через REST API pinned calls.

## Текущее понимание

Новая модель WUI-5185 использует отдельный FSD-слайс `src/entities/pinned-calls` и не зависит от legacy `usePinnedCallsStore` из `src/entities/call-session`.

Backend возвращает единую panel-модель:

- `slots` — завешенные слоты.
- `groups` — группы завешенных.

UI-сетка показывает **21** слот (`PINNED_CALLS_UI_SLOT_COUNT` = `PINNED_CALLS_API_MAX_ORDER` = 21).

Число колонок сетки задаётся через `WidgetViewport` (`entities/workspace`): monopoly → 3, two-thirds / half → 2, one-third → 1. Контекст передаётся родителем (`WidgetViewportProvider`); в p2 подключена только панель завешенных (`usePinnedCallsGridColumns`).

Высота рядов: `minmax(106px, 1fr)` + `min-height: max(100%, rows×106 + gaps)`. Если viewport выше минимума — ячейки растягиваются; иначе — ≥106px и вертикальный scroll.

Индекс дубля `pServed`: если `getSlotsByPServed(...).length > 1` — бейдж `slotIndex` в строке номера (справа сверху). Токены `pinnedline-slot-{dis|def|act}`.

Карточка слота (Figma `pinnedline`, widget `PinnedCallsPanelSlotCard`): 3 зоны mic | mid+volume | status. Визуал и иконки — `widgets/pinned-calls-panel/model/pinned-call-slot-card-view.ts`.

## Основные сущности

- `PinnedCallSlot` — слот завешенной линии. Основная позиция в UI задаётся `order`.
- `PinnedCallGroup` — группа завешенных. Backend/FE index: `0..7` (`PINNED_CALLS_GROUP_COUNT = 8`). Index 7 включён.
- `PinnedCallGroupMember` — ссылка на слот через пару `pServed + slotIndex`.
- `PinnedCallGroupCell` — UI-ячейка группы: backend index + displayNumber `1..8`. Раскладка и карточки — `domain/broadcast-groups.md`.

## Пользовательские сценарии

- Пользователь видит сетку из 21 слота на монопольной странице (колонки по `WidgetViewport` + scroll).
- В режиме редактирования: context menu (очередь / справочник / move-swap / удалить), пустая ячейка — `+`.
- Вне edit пустые слоты не показывают `+`; если ни одной завешенной линии нет — `EmptySetupPrompt` «Нажмите, чтобы создать завешенные линии» → вход в edit.
- Вне edit: idle → dial со статус-кнопки; outgoing → cancel; incoming → answer; active → toggle слышимости; hold → unhold.
- Active/hold: клик по центру карточки открывает **call card** в pinned-presentation (без handset bind).
- Hold **поставить** можно только из call card; снять — из call card (local). На слоте hold — только индикация.

## Визуальная матрица карточки

View-state: `idle` | `outgoing` | `incoming` | `active` | `hold`.

Connected (`active`) + mic/volume → CSS visual:

| mic | volume | visual |
|-----|--------|--------|
| off | > 0 | `inactive` |
| off | 0 | `inactive-muted` |
| on | > 0 | `active` |
| on | 0 | `active-muted` |

- Mic icons: off → `micM`, on → `micF`. Дефолт mic слота **off** (`PINNED_CALLS_INITIAL_MIC_STATE = false`); REST `micState` при normalize игнорируется.
- Mic кликабелен только в `active`/`hold` (в PTT `activePinned` — только аппаратный speak).
- Idle / out / inc / hold: mic+mid dim (`*-dis`); цвет только у правой кнопки.
- Правая кнопка dual-mode:
  - вне connected: действие (idle phone / out / inc / hold icons);
  - в `active`: mute toggle (`volumeOnF` / `volumeOffM`, pressed ⇔ volume 0).
- Hold icons: local → `pauseF`; remote → `pauseM` (`isPinnedCallLocalHold`).
- Выделение (`activeSlotOrder` + view active/hold): mic on — только рамка; mic off (`inactive*`) — рамка + `bg-inactive-hov` (status mute negcon не перекрашиваем).
- VAD на слайдере (как футер групп): серые полосы при `active`/`hold`; синяя дорожка = `remoteVoiceLevel` при `remoteVoiceDetected`.
- Слайдер: idle `sldr-brd-inactive-dis`; с сессией `inactive-def`; mute thumb `sldr-btn-neg`.

## Правила и ограничения

- Runtime `sessionId` не отправляется в REST API и хранится только на фронте (`slotSessionIds`).
- Mic/volume слота — runtime в panel store; REST не источник истины на этом этапе.
- Effective playback: `slot.volume × globalVolumeMultiplier` (footer). UI карточек footer не зеркалит.
- Effective mic: goose global × `slot.micState` (в `stateful` / PTT `standard`).
- PTT `activePinned`: mic только при press speak и только для `activeSlotOrder` на момент press; UI toggle mic линии заблокирован (WUI-3825). Подробности — `speakers-ptt.md`.
- Входящий садится в свободный слот того же `pServed`; если свободных нет — на трубку (можно добавить через edit-меню).
- Call card pinned: `openPinnedPanelSession` — без bind к трубке; UI через `TurretCallCard` + adapter `capabilities` (без history/pin/handsetSwap/transfer); очередь = bound pinned-сессии с mic-иконками; hold через `toggleSelectedSessionHold`.
- После `clearSlot` / замены слота connected-сессия возвращается на трубку через полный `bindSessionToDevice` (если есть peerconnection); иначе affinity. Только affinity оставлял mic track на goose.
- Hangup трубки при временно подхваченной pinned-сессии: connected → полный `bindSessionToDevice` обратно на goose; иначе affinity. Только affinity оставлял mic track на handset.
- Несколько слотов могут ссылаться на один `pServed`; такие слоты различаются через `slotIndex`.
- Группа хранит members не по `order`, а по паре `pServed + slotIndex`.
- **Group audio override** (`applyGroupAudioToMembers`): меняет mic/volume **только у members** группы; non-members не трогаем. Запрещено старое правило «включили mic в группе → mute всем вне группы».
  - UI групп: `domain/broadcast-groups.md` (`widgets/broadcast-groups-panel`).
  - Mic overlap: **OR** по группам слота.
  - Volume > 0: **last-action** текущей группы; mute/0: **max** last-volume других audible-групп слота.
  - `volumeState: false` → запрос `volume = 0` (с учётом max); `true` → restore `groupPlaybackVolumeByIndex` (или INITIAL).
  - Локальные флаги группы (`upsertLocalGroup`); REST sync group mic/volume — отдельно.
  - **WUI-5615:** после успешного `updateGroup` / `addGroupMember` — тот же override на **всех текущих members** (явный mic/volume patch). После `fetchPanel` — sync всех групп; при `assignSessionToSlot` — `applyGroupsIntentToSlot` перед apply к сессии. Детали и card↔group (вариант A) — `domain/broadcast-groups.md`.
- Карточка слота ↔ группа (A): локальный mic/volume на pinned-карточке не меняет intent группы и не трогает других members; следующее group-действие / sync состава снова выравнивает members.
- Effective hierarchy (цель): footer × (group) × card; group factor пока через прямое изменение slot runtime.

## Edge cases

- Если backend вернёт group member без соответствующего слота, future UI должен уметь показать/обработать неразрешённую ссылку отдельно; текущий helper `getGroupSlots` возвращает только разрешённые слоты.
- После успешного `clearSlot` фронт локально убирает member (`pServed + slotIndex`) из всех groups — backend чистит сам, DELETE не шлём (404).
- Native `input[type=range]` thumb может рисоваться поверх `wui-dialog` (`z-[99]`); на volume wrapper pinned-карточки — `contain: paint` / без `z-index` на slider.

## Связанные страницы

- `../domain/broadcast-groups.md`
- `../domain/calls.md`
- `../domain/devices.md`
- `../domain/speakers-ptt.md`
- `../domain/quick-call-panel.md`
- `../frontend/stores.md`
- `../backend-integration/im-preferences.md`

## Источники

- Уточнения пользователя по WUI-5185 от 2026-07-07 и 2026-07-17/18/20.
- Уточнения пользователя от 2026-07-23: 21 слот; fill/scroll сетки; матрица pinnedline; VAD; индекс дубля; mic default off.
- Уточнения пользователя по WUI-5293 от 2026-07-21/22/24 (группы `0..7`, overlap audio, clearSlot → local group member cleanup).
- Уточнения пользователя по WUI-5615 от 2026-09-08 (sync on membership change; card↔group = A).
- `.ai/tasks/WUI-5615/case.md`
- `.ai/tasks/WUI-5185/case.md`
- `.ai/tasks/WUI-5185/implementation_plan_5.md`
- `.ai/tasks/WUI-5293/case.md`
- `src/entities/pinned-calls/model/types.ts`
- `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
- `src/widgets/pinned-calls-panel/model/pinned-call-slot-card-view.ts`
- `src/widgets/pinned-calls-panel/ui/PinnedCallsPanelSlotCard.vue`
- `src/widgets/pinned-calls-panel/ui/PinnedCallsPanel.vue`
- `src/features/call-card/model/use-call-card-store.ts` (`openPinnedPanelSession`)

## Открытые вопросы

- REST sync group mic/volume и persist раскладки 4/8 — отдельно от текущего runtime UI.
- Нужен ли единый явный `volume` уровня группы (сейчас DTO — boolean `volumeState`).
- Точные значения токенов `comp/pinnedline/slot/{dis,def,act}` в core developerV (сейчас добавлены локально по макету).
