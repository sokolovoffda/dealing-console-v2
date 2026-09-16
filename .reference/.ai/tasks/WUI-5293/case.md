# WUI-5293 — Broadcast groups: UI и функционал

## Исходная задача

Jira: `Broadcast groups. Привести в соответствие с дизайном, реализовать функционал`  
Статус: Анализ · Clone of WUI-5185 (Pinned calls).

Нужна страница/виджет **бродкаст-групп**, по паттерну завешенных линий (WUI-5185): отдельный UI поверх уже существующей panel-модели `pinned-calls` (slots + groups).

Группы управляют участниками пачками; участники — это **завешенные абоненты** (pinned slots). Управление возможно:
- по одному со страницы завешенных;
- пачками со страницы/виджета broadcast groups.

## Уточнения пользователя

### Контекст чата (2026-07-21)

- Чат в рамках WUI-5293; требования обсуждаем; план — после согласования.
- Токены из `core` `*-developerV.css` уже занесены (pinnedline + broadcast + voice ind).
- Макеты DS:
  - карточка группы: `node-id=1269-15146` (state=call, mic=on, speaker=on);
  - пустая ячейка: `node-id=1222-1448`;
  - линия абонента: `node-id=1225-2800` (active + voice detect).
- Скрины состояний (чат):
  1. сетка empty / неактивные группы (+ в edit);
  2. обзор нескольких групп;
  3. **неактивная группа** — нет ни одной активной сессии у участников (текст тёмный, без фона строки);
  4. есть ≥1 активная сессия, участники **mute**; voice detect на линии + общий voice detect в футере карточки;
  5. то же, **volume 0** (красный speaker / thumb);
  6. участники **unmute** (зелёный футер / mic on);
  7. unmute + **volume 0**.

### Продукт / раскладка (2026-07-21)

- Один и тот же UI-компонент: monopoly-страница **и** workspace widget.
- Раскладка: **4 или 8** групп; выбор через **контекстное меню** (не кнопки в хедере).
  - Если раскладки ещё нет — `EmptySetupPrompt` (`userGroupM` + «Нажмите, чтобы настроить раскладку групп»); клик → меню с пунктами 4/8.
  - 8 (2×4): monopoly / **2/3** — 4 колонки, fill; **half** / **1/3** — 2 колонки, высота ячейки как у раскладки 4 (½ viewport), 4 ряда + **скролл**.
  - 4 группы: monopoly / **2/3** — 4 колонки в ряд, fill; **half** / **1/3** — 2×2 fill по высоте.
  - Viewport через `useWidgetViewport` (как pinned).
  - Если раскладка выбрана: в edit клик по ячейке группы → контекстное меню (пункты управления группой — позже; внизу «Сменить раскладку», **только если ни в одной группе ещё нет members**).
  - «Сменить раскладку» сбрасывает localStorage-раскладку → снова empty prompt.
- Переключатель 4/8 — через меню, и на monopoly, и в виджете (один компонент).
- Persist раскладки: **временно localStorage → потом REST**.
- Backend groups: `0..7` (8 групп). 8-я ячейка **включена** (уточнение 2026-07-22 — backend починили).
- Пустая группа (без members) — валидна; в edit показывается как `+`. **Вне edit пустые ячейки держат позицию в сетке (невидимый пробел), чтобы №1 и №3 не схлопывались** (уточнение 2026-07-24; отменяет «вне edit пустые не показываем» от 2026-07-22). Промпт «создать группы» — только если **ни у одной** группы нет members.

### Swap / перемещение групп (2026-07-24)

- UX: в контекстном меню **«Переместить влево»** / **«Переместить вправо»**.
- Порядок слотов — слева направо: `0..3` / `0..7`. Сосед пустой → переезд; занят → swap.
- Крайние слоты disabled; с пустой ячейки пунктов нет.
- **Было (временно):** `swapGroups` = два `PUT /groups/{index}`.
- **Backend готов (уточнение 2026-07-24, контракт от backend):** атомарный reorder — фронт переключается на один запрос.
- **UI (2026-07-24):** `swapGroups` — optimistic локальный swap + `PUT groups/reorder`; при ошибке откат; ответ panel DTO к groups не применяем (stale response).

#### `PUT /api/v1/me/pinned-calls/groups/reorder` (зеркало `/users/{userId}/...`)

- Body: `{ "fromIndex": 2, "toIndex": 1 }` — поля **`fromIndex`/`toIndex`** (0..7), не `fromOrder`/`toOrder` (у групп ключ `index`).
- Поведение: меняет местами **содержимое** двух групп (`micState`, `volumeState`, `members`); индексы ячеек на месте.
- Ответ: полный `PinnedCallsPanelDto`.
- Raw: `.ai/knowledge/raw/jira/WUI-5293-groups-reorder-endpoint.md`.

### REST persist раскладки (2026-07-24)

Backend готов. OpenAPI excerpt: `.ai/knowledge/raw/jira/WUI-5293-pinned-calls-openapi-excerpt.json`.

Panel DTO:
```json
{
  "schemaVersion": 1,
  "slots": [ ... ],
  "groups": [ { "index": 0..7, "micState", "volumeState", "members": [...] } ],
  "groupsLayout": 4
}
```

- `groupsLayout`: `4 | 8 | null` (required в `PinnedCallsPanelDto`; `null` = раскладка не зафиксирована на backend).
- `PUT /api/v1/me/pinned-calls/groups/layout` body `{ "groupsLayout": 4|8|null }` → `200` panel; **`409`** если смена заблокирована (members в затронутых группах).
- Позиции групп на сетке = **index** группы (`0..7`); отдельного API координат ячеек нет. Layout 4 → UI `0..3`; layout 8 → `0..7`.

#### Когда писать в API (уточнение 2026-07-24)

- **localStorage отключаем** — не нужен, миграцию из него не делаем.
- Выбор раскладки 4/8 до создания первой группы — **только runtime** (память сессии UI/store). Reload до первой группы → снова empty prompt.
- Как только **создали первую группу** (первый group с members / первое успешное добавление участника) → **фиксируем на API**: `groupsLayout` + положение группы (`index` через уже существующие group/member endpoints).
- Пока групп с members нет — можно свободно менять runtime-раскладку без PUT.
- После фиксации layout живёт в panel; смена/сброс — через PUT (с учётом 409), если продукт это ещё допускает при пустых группах.
- **Legacy heal (2026-07-24):** если на backend уже есть groups с members, а `groupsLayout: null` — UI infer (max index ≥ 4 → 8, иначе 4) и при `fetchPanel` best-effort `PUT groups/layout`.

#### Карточка группы

Структура:
1. **Header** — «Группа №N».
2. **Список участников** — имена pinned slots-members.
3. **Footer** — mic toggle | **volume slider** (+ voice activity) | speaker/mute indicator.

Состояния строки участника:
- нет сессии → тёмный текст, без фона;
- есть сессия (active), без VD → светлый текст;
- active + voice detect → светлый текст + фон строки + иконка VD справа.

**Аудио группы (уточнение 2026-07-21):**
- **Слайдер** = с какой громкостью **слышим группу**; уровень **выравнивается у всех members** на одно значение (`applyGroupAudioToMembers` с явным `volume`).
- **Mic** = только **toggle on/off** для members группы (не уровень).
- **Volume-кнопка** = toggle mute слышимости: прожата ⇔ `volume === 0`; отжатие → restore предыдущий уровень; слайдер > 0 → кнопка не прожата.
- Вне edit карточка **только управляет звуком и показывает активность**; клик по строке/карточке **не** dial и **не** открывает call card.
- Группа **не** является отдельным источником audio-runtime: она управляет **member-слотами pinned-calls** массовой командой.
- Изменение группы действует **сверху вниз**: `group action -> pinned member slots -> session audio`.
- Target member всегда по ключу `pServed + slotIndex` (один `pServed` с A/A1/A2/A3 — независимые слоты).
- Локальное изменение конкретного pinned-слота после этого **разрешено** и не должно немедленно менять состояние группы само по себе.
- UI группы показывает **intent группы** (`group.micState` / group volume), а не обратную синхронизацию от одного member.

**Overlap одного slot в нескольких группах (уточнение 2026-07-22):**
- **Mic = OR** по всем группам, где состоит slot: если хотя бы в одной группе mic on → effective mic on; mic off только если во **всех** таких группах mic off.
- **Volume > 0 (слайдер / unmute) = last-action**: текущая группа выставляет этот уровень всем своим members и перебивает предыдущий volume слота.
- **Volume = 0 (mute / слайдер в 0) = max по другим группам**: не глушить слот вслепую; если slot ещё в группах с `volumeState === true`, effective volume = **max** их last group-volume; иначе 0.
- UI muted-группы может показывать mute у себя, при этом slot остаётся слышимым из-за другой группы — ожидаемо.
- Следующее **mic**-действие группы обновляет `group.micState` и пересчитывает effective mic members по OR.

**Футер карточки — матрица состояний (уточнение 2026-07-22):**

Оси:
- **disabled** = нет активности у members **или** режим edit. Активность = ≥1 member в `CONNECTED` / `ONHOLD`.
- В disabled / edit: визуал как **п.1**; показывается **фактическое** mic/volume; один общий фон футера; клики и слайдер недоступны.
- **Mic:** не прожат → `micM` (mic off); прожат → `micF` (mic on). Не `micOffM`.
- **Volume:** `volume === 0` → прожата + `volumeOffM`; `volume > 0` → не прожата + `volumeOnF`. Прожатость = только 0 (нельзя volume > 0 и «прожата»).
- Тянем слайдер в 0 → сразу визуал mute (п.3 или п.5).

| # | Условие | Фон футера / зоны | Mic | Slider | Volume |
|---|---------|-------------------|-----|--------|--------|
| **1** | disabled (нет активности **или** edit) | весь футер `pinnedline-bg-inactive-dis`; взаимодействия нет | icon `pinnedline-icon-inactive-dis`; иконка факт. `micM`/`micF` | bg `sldr-bg-def`; brd `sldr-brd-inactive-dis`; thumb `sldr-btn-def` | icon `pinnedline-icon-inactive-dis`; иконка факт. `volumeOffM`/`volumeOnF`; без negcon-фона |
| **2** | active, mic off, volume > 0 | `pinnedline-bg-inactive-def` (общий); без отдельного btn-bg у mic/volume | icon `pinnedline-icon-inactive-def`; `micM` | bg `sldr-bg-def`; brd `sldr-brd-inactive-def`; thumb `sldr-btn-def` | icon `pinnedline-icon-inactive-def`; `volumeOnF` |
| **3** | active, mic off, volume = 0 | как п.2 + у volume negcon | как п.2 | как п.2, но thumb `sldr-btn-neg` | bg `btn-negcon-bg-def`; brd `btn-negcon-brd-def`; icon `btn-negcon-icon-def`; `volumeOffM` |
| **4** | active, mic on, volume > 0 | `pinnedline-bg-active-def`; brd **всех трёх зон** `pinnedline-brd-active-def` | bg `btn-callcon-active-bg-def`; icon `btn-callcon-active-icon-def`; `micF` | bg `sldr-bg-def`; brd `sldr-brd-active-def`; thumb `sldr-btn-def` | icon `btn-callcon-active-icon-def`; `volumeOnF` (без отдельного pressed-bg) |
| **5** | active, mic on, volume = 0 | как п.4, но volume — negcon | как п.4 | как п.4 (brd `sldr-brd-active-def` / зона `brd-active-def`), thumb `sldr-btn-neg` | bg `btn-negcon-bg-def`; brd `btn-negcon-brd-def` (не active); icon `btn-negcon-icon-def`; `volumeOffM` |

Полные token-пути (Figma / CSS): `comp/pinnedline/...` → классы/CSS vars `pinnedline-*`.
Комбо «mic on + volume on» без callcon **нет** — сразу п.4.

**Voice detect (уточнение 2026-07-21 / 2026-07-22):**
- Делаем **локально**, как уже в проекте: `remoteVoiceDetected` сессии через `AnalyserNode` (`useSessionSpeakerIndication` / `useSessionFacade`) — не SIP и не отдельный backend-сигнал.
- На строке участника: флаг VD его pinned-сессии; в **edit тоже показываем** (trash рядом/вместо — по UX: VD приоритетнее или оба — VD если есть, иначе trash в edit).
- Иконка строки: пока `userM` (в либе ещё нет `userWaveM`).
- В футере группы: агрегат **OR** по members с активной сессией (`remoteVoiceDetected`).
- VD-трек в слайдере: занимает **свободное пространство** `.wui-input-range__scale` (под thumb).
  - **Серые полосы** (`sldr-ind-inactive`) на всю ширину free space — если в группе ≥1 активная сессия (даже без VD).
  - **Синяя активная дорожка** (`sldr-ind-active`) поверх — ширина = **max `remoteVoiceLevel`** (AnalyserNode 0..100) среди говорящих; анимация бегущих полос.
  - Без активных сессий — полосок нет.
- Wiki по VD — в **шаге 7**, не в шаге 6.

**Заготовка VAD в UI (2026-07-22, сделано в шаге 6):**
- Строка: `remoteVoiceDetected` → `bg-broadcast-bg-act` / `brd-act` + иконка `userM` (временно до `userWaveM`).
- В edit: при VD — иконка; иначе trash.

**Временный override слайдера (2026-07-22):**
- В `BroadcastGroupCardFooter.vue` — wrapper + `--color-rng-*` из `broadcast-*-sldr-*`, т.к. `WuiInputRange` с `inheritAttrs: false` кидает attrs на `<input>`, не на корень.
- Figma range: `node-id=1269-14793` (файл DS `nHpUIa0p2qjRVFj3hJm4e9`); размер Fill × 56, thumb 16×48.
- **Убрать**, когда в common-library `class`/`style` попадут на `.wui-input-range` (или появится size/tone API).

**VAD в футере-слайдере (уточнение 2026-07-22):**
- В либу **не** выносим.
- Не делаем отдельный absolute-div под range (ломается на ресайзе).
- VD-диапазон = свободное пространство scale (`::before` / `::after` через `:deep`), z-index под thumb.
- `::before` — серые полосы на 100% free space при ≥1 active session.
- `::after` — синяя дорожка = max `slot.volume` среди members с VD + animation.
- Цвета — `pinnedline-sldr-ind-inactive-def` / `pinnedline-sldr-ind-active-def`.

### Edit / участники (2026-07-21)

- Источник members — **только pinned** (не directory / не очередь).
- Member обязан совпадать с pinned slot (`422` если нет).
- Один pinned slot **может** состоять в **нескольких** группах.
- Несколько слотов с одним `pServed` (разный `slotIndex`) — ок в pinned и в группе; индексы на карточках группы — позже.
- Правило: удалили из pinned → member должен пропасть и из группы. Backend чистит сам; фронт после успешного `clearSlot` убирает member локально из всех groups (`removeLocalGroupMember`), без DELETE (иначе 404). Уточнение 2026-07-24.
- **Лимита members нет** (убрать/не опираться на `PINNED_CALLS_GROUP_MAX_MEMBERS = 7` как продуктовый потолок; сверить с backend).
- Добавление в edit: модалка «Добавить бродкаст группу» (скрин 2026-07-21) — **обёртка над `AppModal`**, паттерн `CreateGroupModal`:
  - `WuiCombobox` `isMultiple` (chips + checkbox list);
  - items = массив **завешенных слотов** (не directory);
  - кнопки Отмена / Добавить через footer `AppModal`.
  - `AppModal` расширять только при реальной нехватке API.
- Пустая ячейка без members: в edit — `+` открывает эту модалку.
- Контекстное меню — **переиспользовать** существующее (`ContextMenu` / `useContextMenu` из `shared/ui`), как в pinned.

### Стек / порядок реализации (предположения пользователя, 2026-07-21)

1. Сетка (как в других виджетах, свои размеры карточки / 4|8).
2. Добавление в группу (`AppModal` + Combobox, как `CreateGroupModal`).
3. Различное редактирование (edit mode, меню, раскладка, удаление members).
4. UI карточки группы + audio-действия (mic / slider / speaker).
5. VAD — в конце.
6. Тесты — в конце.

### Backend API (уже в `entities/pinned-calls`)

- `PUT /api/v1/me/pinned-calls/groups/{index}` — `{ micState, volumeState, members[] }`
- `POST /api/v1/me/pinned-calls/groups/{index}/members` — `{ pServed, slotIndex? }`
- `DELETE /api/v1/me/pinned-calls/groups/{index}/members` — `{ pServed, slotIndex? }`
- Ошибки: `409` member already exists; `422` member не матчит pinned slot.

### Связь с WUI-5185 / код

- Store/API: `usePinnedCallsPanelStore` — `groups`, `groupCells`, `add/removeGroupMember`, `updateGroup`, `applyGroupAudioToMembers`.
- Сейчас: `PINNED_CALLS_GROUP_COUNT = 8` (`0..7`). UI раскладки 4|8; пустые ячейки держат позицию в сетке и вне edit.
- Route `BroadcastGroups` → `BroadcastGroupsPage` + `BroadcastGroupsPanel`.
- Workspace `groups` → тот же `BroadcastGroupsPanel` в registry (как `pinnedCalls`), без `WorkspaceGroupsWidget`-обёртки.
- Паттерн: `widgets/pinned-calls-panel` + edit header + один widget component.

## Ограничения

- Не дублировать panel store: UI broadcast опирается на `entities/pinned-calls`.
- FSD + public API; без новых зависимостей без согласования.
- Mic/volume групп: runtime + REST `micState`/`volumeState` на группе; явный volume members — runtime (как у слотов).
- Тесты/сборки — только с согласия.
- Legacy `usePinnedCallsStore` не трогать без нужды.

## Связанные материалы

- Jira: https://jira.satel.org/browse/WUI-5293
- Clone: WUI-5185 — `.ai/tasks/WUI-5185/case.md`
- Wiki: `.ai/knowledge/wiki/domain/pinned-calls.md`
- Код: `src/entities/pinned-calls`, `src/widgets/pinned-calls-panel`
- Route: `src/app/router/index.ts` → `BroadcastGroups`
- Registry: `src/pages/main/model/workspace-widget-registry.ts` (`groups`)
- Токены: `lsDark-1.css` / `light-1.css` (`pinnedline-*`, `broadcast-*`)
- Figma DS: card `1269-15146`, empty `1222-1448`, user line `1225-2800`
- Скрин модалки «Добавить бродкаст группу»: chips + multiselect (чат 2026-07-21)
- План: `.ai/tasks/WUI-5293/implementation_plan_1.md`
- План REST layout: `.ai/tasks/WUI-5293/implementation_plan_2.md`
- План move left/right: `.ai/tasks/WUI-5293/implementation_plan_3.md`
- План groups/reorder API: `.ai/tasks/WUI-5293/implementation_plan_4.md`
- OpenAPI excerpt: `.ai/knowledge/raw/jira/WUI-5293-pinned-calls-openapi-excerpt.json`
- Groups reorder raw: `.ai/knowledge/raw/jira/WUI-5293-groups-reorder-endpoint.md`

## Открытые вопросы

- (нет по layout persist)

## Закрытые вопросы

- Persist layout: localStorage **не** используем; до первой группы layout runtime; при создании первой группы — `PUT groupsLayout` + group index на API (2026-07-24).
- Speaker в футере — отдельный mute-toggle: прожат ⇔ volume 0; отжатие → restore prev; слайдер синхронизирует визуал (2026-07-22).
- Направление синхронизации аудио: группа управляет member-слотами pinned-calls; одиночная правка slot runtime не обновляет group state автоматически (2026-07-22).
- Overlap слота в нескольких группах: **mic = OR**; volume > 0 = **last-action**; mute/0 = **max** по другим audible-группам; identity = `pServed + slotIndex` (2026-07-22).
- VD футера: агрегат **OR**; VD в free space scale; ширина = max volume говорящих + анимация дорожки; иконка строки пока `userM`; VD виден и в edit; wiki в шаге 7 (2026-07-22).
- Wiki `domain/broadcast-groups.md` + правки `pinned-calls.md` / index / log (2026-07-22).
