# Кейс: WUI-5185 — Pinned calls UI и сессии (часть 2)

## Описание текущей части кейса

Обновить новую панель завешенных под макеты и рабочий сценарий оператора: сетка 15 (временно, цель 21) без блока управления звуком, адаптивные колонки со скроллом (3 / 2 на 2/3 / 1 на 1/2 и 1/3), карточка из трёх зон (серая), edit-меню как в ПБВ (очередь / справочник / move-swap), dial/answer/cancel и active-управление, упрощённая call card для pinned, иерархия слышимости footer → (группы позже) → карточка. Цвета и UI групп — не в этой части.

## Контекст предыдущих частей

- `implementation_plan_1.md` — REST API, store, сетка 15, edit add/clear/reorder, groups в store без UI.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/pinned-calls.md`
- `.ai/knowledge/wiki/domain/calls.md`
- `.ai/knowledge/wiki/domain/devices.md`
- `.ai/knowledge/wiki/domain/quick-call-panel.md`

# План реализации: UI сетки, карточка, сессии, связь с приложением

## Шаг 1: Сетка 15 (временно), убрать audio-controls, адаптивные колонки + scroll

- **Описание:** Оставить `PINNED_CALLS_UI_SLOT_COUNT = 15` / `API_MAX_ORDER = 16` (временно, пока backend не расширит лимит; цель позже — 21). Убрать из grid item «Управление звуком» и связанные spacers. Сетку строить на grid с колонками по ширине контейнера: 3 на широкой, **2 на 2/3**, **1 на 1/2 и 1/3** (порог ~520px). Высота ячеек ~106px; при нехватке места — **вертикальный scroll** (flex-цепочка `min-h-0` + `overflow-y-auto`, как в ПБВ). Empty вне edit — пустая ячейка без `+`; в edit — `+` как в ПБВ.
- **Файлы для изменений:** `src/entities/pinned-calls/model/types.ts`, normalizers/store при необходимости, `src/widgets/pinned-calls-panel/model/use-pinned-calls-panel-grid.ts`, `PinnedCallsPanel.vue`, `PinnedCallsPanelSlotCard.vue`; удалить/отключить использование `PinnedCallsPanelAudioControls.vue`.
- **Ожидаемый результат:** На монопольной видно 15 слотов (3×5); на 2/3 — 2 колонки; на 1/2 и 1/3 — 1 колонка + scroll при переполнении; блок управления звуком исчез; edit/`+` поведение как в ПБВ.
- **Проверка:** Ручной просмотр раскладок (после согласия на dev server) или review разметки.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет (wiki — шаг в конце или после стабилизации контракта).

## Шаг 2: Каркас UI карточки (3 зоны, серые состояния без полной session-логики)

- **Описание:** Пересобрать `PinnedCallsPanelSlotCard` по макету: слева mic, центр (номер/имя + volume selector), справа status-кнопка. Визуальные состояния default / incoming / outgoing / active пока на моках или простых props (серая палитра; mid disabled темнее в non-active). Mic/volume в default **не** disabled. Цветовые токены callcon/warncon не подключать. Persistence mic/volume в REST на этом шаге не трогать сценариями — готовим только UI + локальные runtime-поля в store при необходимости.
- **Файлы для изменений:** `PinnedCallsPanelSlotCard.vue` (+ при необходимости дочерние UI-части в том же widget slice), store types если нужны view-state поля.
- **Ожидаемый результат:** Заполненный слот выглядит как трёхзонная карточка; пустой в edit — `+`; клики по зонам пока заглушки/эмиты без полной telephony.
- **Проверка:** Визуальный review / ручной просмотр.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Edit context menu — очередь, справочник, move/swap (паттерн ПБВ)

- **Описание:** В edit mode клик по ячейке открывает `ContextMenu`: пункты из очереди call card + «добавить из справочника» (`ChangeContactsModal`). Выбор сразу `upsertSlot`. Для занятой ячейки — заменить / переместить; move mode как в ПБВ: клик по целевой занятой → `reorder` swap, по пустой → move. Drag-reorder из части 1 заменить/не использовать — только меню. Вне edit меню нет.
- **Файлы для изменений:** `use-pinned-calls-panel-slot-actions.ts` (+ move-state composable по аналогии с quick-call), `PinnedCallsPanel.vue` / slot card, возможно thin feature helpers в widget model.
- **Ожидаемый результат:** Полный edit-flow раскладки без drag; очередь и справочник пишут в слот сразу.
- **Проверка:** Ручные сценарии add/replace/move/swap после согласия на запуск.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: Runtime mic/volume в store + dial/cancel/answer по кнопке-статусу

- **Описание:** Mic/volume слота держать как runtime в panel store (дефолт mic on, volume 1 на старте дня/сессии приложения); не делать опорой REST-persistence. Правая кнопка: default → исходящий сразу (call card не открывать); outgoing → cancel; incoming → answer. Привязка входящего к слоту по `pServed`; если все слоты этого номера заняты — сессия на трубку (существующая логика handset), слот можно заполнить позже через меню.
- **Файлы для изменений:** `use-pinned-calls-panel-store.ts`, session bridging (существующие call-session / devices-sessions hooks), slot card actions, возможно небольшой composable в widget/feature.
- **Ожидаемый результат:** С серого default можно позвонить и отменить; входящий на известный слот отображается и принимается с карточки.
- **Проверка:** Ручной SIP/WebRTC сценарий (только вручную).
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 5: Active — mic, volume UI, toggle звука линии, unhold; hold только из call card; footer override

- **Описание:** В active: mic и volume selector влияют на линию; правая кнопка тоглит слышимость линии (иконки). С hold: кнопка-статус может **снять** hold; поставить hold — только из call card (шаг 6). Footer — глобальный рубильник: если выключен, effective audio для всех завешенных = off, даже когда на карточках mic/volume «вкл». UI карточек не обязан переключаться вслед за footer. Effective = footer × (позже group) × card. Блок audio-controls уже убран на шаге 1.
- **Файлы для изменений:** store session-effects / volume helpers, slot card, связь с footer/global multiplier (уже есть задел `globalVolumeMultiplier` в store).
- **Ожидаемый результат:** Параллельные линии управляются локально; footer реально глушит всех; локальный UI карточек может оставаться «вкл»; unhold с сетки работает.
- **Проверка:** Ручной сценарий нескольких линий + footer mute.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 6: Call card для завешенных (тот же компонент, упрощённый)

- **Описание:** Клик по центру active-карточки открывает call card без handset-binding. Упрощения: без истории; очередь — минимально (по возможности список связанных pinned-сессий) или временно урезанная панель — уточнить в ходе шага по коду call-card. Hold доступен из этой карточки. Не ломать трубочный сценарий WUI-5081.
- **Файлы для изменений:** `src/features/call-card/**` (точечно), widget/feature связка открытия pinned session card.
- **Ожидаемый результат:** Из сетки открывается карточка завешенного вызова; hold только оттуда; трубочная карточка не регрессирует.
- **Проверка:** Ручное сравнение handset vs pinned open/hold.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да — `domain/pinned-calls.md` (+ при необходимости `domain/calls.md`): 15 слотов временно (цель 21), edit menu, иерархия footer/group/card, runtime mic/volume, правила incoming routing, call card для pinned.

## Шаг 7 (задел, без UI групп): контракт group override в store

- **Описание:** Зафиксировать в store/helpers правило: изменение group volume/mic применяет новое состояние **только members**; non-members не трогать. Без страницы групп и без старого «mute всех вне группы». Если готовых group actions UI нет — только API/store методы + короткий комментарий/wiki.
- **Файлы для изменений:** `use-pinned-calls-panel-store.ts` (group apply helpers), wiki.
- **Ожидаемый результат:** Есть явное место ответственности для будущего UI групп; поведение документировано.
- **Проверка:** Unit/ручная проверка helper на фикстурах — только с согласия; иначе review кода.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да — дописать правило override в `domain/pinned-calls.md` и `log.md`.
