# Кейс: WUI-5293 — Broadcast groups: UI и функционал

## Описание текущей части кейса

Собрать страницу/виджет бродкаст-групп поверх `entities/pinned-calls` (groups + `applyGroupAudioToMembers`), по паттерну `widgets/pinned-calls-panel`.

Порядок по согласованию: **сетка → добавление members → edit → UI карточки + audio → VAD → тесты**.

Стек:
- сетка как у других виджетов (`WidgetHeader` / `PanelStatus` / CSS grid), свои размеры (карточка ~466px; раскладка **4** или **8**);
- контекстное меню — существующее `ContextMenu` + `useContextMenu`;
- модалка добавления members — тонкая обёртка над **`AppModal`** (паттерн `CreateGroupModal`), внутри `WuiCombobox` `isMultiple`, items = завешенные слоты.

Временно: persist 4/8 в **localStorage**; 8-я ячейка (**index 7**) **disabled**, пока backend на `0..6`.

## Контекст предыдущих частей

- Предыдущих `implementation_plan_*.md` нет.
- Токены `pinnedline-*` / `broadcast-*` уже в темах.
- Store/API groups уже есть в `usePinnedCallsPanelStore`.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/pinned-calls.md`
- `.ai/knowledge/wiki/frontend/components.md`
- Связанные страницы `domain/broadcast-groups.md` пока нет (создать в финале при необходимости).

# План реализации: Broadcast groups panel

## Шаг 1: Каркас виджета + сетка 4/8

- **Описание:** Создать FSD-слайс `widgets/broadcast-groups-panel` (public API). Подключить monopoly-страницу и workspace widget вместо `PageDevelopment`. Хедер «Бродкаст группы» + toggle edit. Сетка ячеек из `groupCells` (+ placeholder index 7 для раскладки 8). Раскладка 4/8: в edit — переключатель; persist в **localStorage**. 8 → 2×4; 4 → колонка по высоте / auto-fit по minmax(~466px). Ячейка index 7 — disabled (не кликабельна, визуально недоступна). Пока empty/`+` stubs без логики members.
- **Файлы для изменений:**
  - `src/widgets/broadcast-groups-panel/**` (новый)
  - `src/pages/main/ui/BroadcastGroupsPage.vue` (новый) + route `BroadcastGroups`
  - `src/pages/main/model/workspace-widget-registry.ts` — `groups: BroadcastGroupsPanel` (как `pinnedCalls: PinnedCallsPanel`)
  - при необходимости тонкий helper localStorage layout в widget model
- **Ожидаемый результат:** Monopoly и widget показывают одну панель; edit toggle; переключение 4/8 переживает reload; 8-я ячейка disabled.
- **Проверка:** ручной просмотр monopoly + widget; `npm run ts:check` (точечно).
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: Модалка добавления members (`AppModal` + Combobox)

- **Описание:** Не писать отдельный каркас модалки. Сделать как `CreateGroupModal`: обёртка над `AppModal` (`title` / `confirmText="Добавить"` / `autoCloseOnConfirm=false` + `closeDialog(result)`). Контент: label «Выберите линию» + `WuiCombobox` `isMultiple`, placeholder «Введите или выберите из списка»; props — массив завешенных слотов (`title` + `pServed`/`slotIndex`/`order`) → `SelectItem[]`. Результат диалога — выбранные members. Открытие из edit по клику на `+` / пункт меню (через `useDialog`). Сохранение: `addGroupMember` по одному или `updateGroup` batch — минимальный путь на существующем API. `AppModal` расширять только если не хватает props/слотов (сейчас хватает: title, confirm/cancel, confirmDisabled, autoCloseOnConfirm). Не опираться на `PINNED_CALLS_GROUP_MAX_MEMBERS` как продуктовый лимит в UI.
- **Файлы для изменений:**
  - `widgets/broadcast-groups-panel/ui/AddBroadcastGroupMembersModal.vue` (или рядом) — как `CreateGroupModal`
  - `widgets/broadcast-groups-panel/model/use-broadcast-groups-panel-actions.ts` — `showDialog` + wire `+`/меню
  - при необходимости mapper slot → `SelectItem` / member в model виджета
  - `AppModal` / `types` — **только если** реально не хватает API (иначе не трогать)
- **Ожидаемый результат:** В edit с `+` выбираются несколько pinned → members в группе после «Добавить».
- **Проверка:** ручной сценарий на стенде с заполненными pinned; 409/422 → notification; `ts:check`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Edit — меню, удаление, правки состава

- **Описание:** Режим редактирования целиком: переиспользовать `ContextMenu` / `useContextMenu` для действий по ячейке/участнику (удалить участника, очистить/добавить — по аналогии с pinned, без directory/queue). Удаление member → `removeGroupMember`. При необходимости правка уже выбранных через ту же модалку (мультиселект с preselected). Layout switcher 4/8 только в edit (если не полностью закрыт в шаге 1). Вне edit клики по карточке/строке **ничего не делают** (кроме будущих audio controls в шаге 4–5).
- **Файлы для изменений:** `widgets/broadcast-groups-panel/model/*actions*`, UI empty/occupied cells.
- **Ожидаемый результат:** Можно добавить/убрать members и работать с пустыми группами; меню не плодит новый framework.
- **Проверка:** ручной edit-сценарий; `ts:check`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: UI карточки группы (без VAD)

- **Описание:** Карточка по Figma/скринам: header «Группа №N», список participants (inactive / active session — без VD), footer: mic toggle | volume slider | speaker (mute/0 визуал). Токены `broadcast-*` / `pinnedline-*`. Состояния группы: нет активных сессий; есть сессии + mute; volume 0; unmute. Без voice-detect индикаторов.
- **Файлы для изменений:** `BroadcastGroupCard.vue` (или аналог) + стили в widget; view-model для member/session lookup из panel store.
- **Ожидаемый результат:** Карточка визуально близка к макету (без VD); список отражает реальные members/slots.
- **Проверка:** ручной визуал vs скрины 3–7 (без VD); `ts:check`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 5: Audio-действия группы

- **Описание:** Подключить footer к `applyGroupAudioToMembers`: mic on/off; слайдер → единый `volume` всем members; speaker/mute → volume 0 / restore последнего group-volume. Группа — **массовый override** поверх member-слотов (`pServed + slotIndex`), не отдельный audio-runtime. Направление: `group action -> pinned member slots -> session audio`. UI группы показывает intent группы, не reverse-sync от одного member. **Overlap:** mic = **OR**; volume > 0 = **last-action**; volume = 0 / mute = **max** last-volume по другим группам слота с `volumeState` (не глушить, если ещё слышен в другой группе). REST sync group mic/volume — только если есть готовый `updateGroup` path без ломки контракта; иначе runtime (зафиксировать в отчёте).
- **Файлы для изменений:** `use-pinned-calls-panel-store.ts` (`applyGroupAudioToMembers` + runtime group volume); `use-broadcast-groups-panel-actions.ts` + panel/cell wiring; при необходимости `broadcast-group-card-view.ts`.
- **Ожидаемый результат:** Слайдер/unmute — last-action volume; mute/0 — max по другим audible-группам; mic — OR; overlap и дубли `pServed`+`slotIndex` корректны.
- **Проверка:** ручной — 2+ members; один slot в 2 группах (mic OR + mute max); A/A1 с одним `pServed`; `ts:check`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет (или коротко в финале)

## Шаг 6: VAD (линии + футер)

- **Описание:** Локальный VD: `session.remoteVoiceDetected`. Строка — фон/иконка (`userM` временно); и в edit (VD > trash). Футер: агрегат **OR**. VD-трек в **свободном пространстве** scale (`:deep` `::before`, под thumb): ширина = max `slot.volume` говорящих; анимация бегущих полос; `pinnedline-sldr-ind-*`. Wiki — шаг 7.
- **Файлы для изменений:** `BroadcastGroupMembers.vue`, `BroadcastGroupCardFooter.vue`, `broadcast-group-card-view.ts`, `BroadcastGroupCard.vue`.
- **Ожидаемый результат:** VD на строке; OR + max-volume дорожка в free space слайдера.
- **Проверка:** ручной на живых сессиях; `ts:check`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет (шаг 7)

## Шаг 7: Тесты + wiki (финал)

- **Описание:** По согласованию: unit/компонентные тесты на layout persist, modal selection → members, audio apply to members, (опционально) VD aggregate. Обновить wiki: `domain/broadcast-groups.md` + index/log; уточнить в `pinned-calls.md` про UI groups 4/8 и disabled index 7.
- **Файлы для изменений:** `*.test.ts` рядом с model/ui; `.ai/knowledge/wiki/**`
- **Ожидаемый результат:** Покрытие согласованных сценариев; стабильное знание в wiki.
- **Проверка:** `npm run test` (точечно) + review wiki.
- **Коммит после шага:** Да (можно разнести tests / wiki на 2 коммита по желанию)
- **Нужно ли обновить project wiki:** Да

## Out of scope / позже

- Persist раскладки 4/8 через REST.
- Миграция pinned UI на новые token-имена.
- Dial / call card с карточки группы.
- Palette colors WUI-4737.
