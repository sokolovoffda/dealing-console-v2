# WUI-5185 — Pinned calls: UI и функционал

## Исходная задача

Jira: `Pinned calls. Привести в соответствие с дизайном, реализовать функционал`.

Нужно разработать новую реализацию pinned calls для монопольной страницы: новый store, типы, отдельный API-слой, сетка и карточки. Старая реализация завешенных пока остается в проекте; новая развивается параллельно.

**Часть 1 (сделана):** REST API layer, store, базовая сетка 15 слотов, edit mode, add/clear/reorder, группы в store без UI страницы групп.

**Часть 2 (текущая):** обновить UI по макетам, доделать функционал карточки/сессий, связать с остальными частями приложения (очередь, карточка вызова, футер). Группы UI / цвета / broadcast — позже.

## Уточнения пользователя

### Часть 1 (исторические)

- Номер задачи: `WUI-5185`.
- API через REST `/api/v1/me/pinned-calls*`; `sessionId` только runtime на фронте.
- Новый store параллельно legacy `usePinnedCallsStore`.
- Группы в том же panel store; UI групп — отдельная страница (позже).
- Перемещение = swap через reorder API.
- Проверки/сборки/тесты — только с согласия пользователя.

### Часть 2 (2026-07-17) — согласованные ответы

Макеты: 1) сетка (edit/empty), 2) офлайн абоненты, 3) входящие/исходящие, 4) активные.

#### Сетка

- Сетка **21 ячейка** (колонки по `WidgetViewport` + scroll). Backend расширен (2026-07-23).
- Высота ячейки: мин. **106px**. Если рядам хватает места — растягиваются на доступную высоту; если нет — остаются ≥106px и появляется **вертикальный scroll**.
  - монопольная: **3 колонки**;
  - раскладка **2/3**: **2 колонки**;
  - раскладка **1/2**: **2 колонки** (уже, чем 2/3);
  - раскладка **1/3**: **1 колонка**.
- Колонки задаются через **`WidgetViewport`** (`entities/workspace`) + `usePinnedCallsGridColumns`; не CSS-порог. Пока подключена только панель завешенных.
- Empty: как в ПБВ — в edit показывается `+`, вне edit пусто (без плюса).

#### Контекстное меню (только edit)

- Клик по ячейке в edit → контекстное меню.
- Пункты: абоненты из **очереди трубочной call card** + последний пункт «добавить из справочника» → `ChangeContactsModal`.
- Выбор из меню / справочника → **сразу upsert** в слот.
- На занятой ячейке: можно **переместить**, **заменить** из очереди/справочника; при перемещении клик по занятой целевой ячейке → **swap** (как в ПБВ, через меню/move mode, не drag).

#### Карточка (3 зоны, пока серая)

1. Слева — mic.
2. Центр — данные абонента + селектор громкости линии.
3. Справа — кнопка-статус (вызов / принять / статус / toggle звука линии).

Состояния и действия:

1. **Default (без сессии):** mic/volume управляемы в UI; правая кнопка → **сразу исходящий** на `pServed` слота, call card при этом **не открывать**.
2. **Outgoing:** отмена кликом по правой кнопке.
3. **Incoming:** принять по правой кнопке → active. Входящий **сразу садится в слот** этого `pServed`. Если все слоты этого `pServed` заняты → сессия уходит на **трубку**; её всё ещё можно добавить в сетку через меню.
4. **Active:** mic меняется; клик по **центру** открывает call card (тот же компонент, упрощённый: без истории; очередь под вопросом — можно показывать сессии завешенных). Правая кнопка-статус = **toggle звука линии**. **Снять с hold** можно кнопкой-статусом; **поставить на hold** — только из call card.
5. В inactive/incoming/outgoing средняя область disabled (темнее). Смена mic/sound не красит карточку — только иконки/статус. Цвета — в конце кейса после согласования.

#### Mic / volume / иерархия

- Блок «Управление звуком» **убрать** из сетки завешенных; глобальный рубильник — **footer** (как сейчас).
- **Footer = глобальное состояние.** Если там всё вырублено, нас никто не услышит / мы никого не услышим — **независимо от статусов mic/volume на карточках**. Карточки при этом могут по-прежнему показывать свои локальные «вкл» (UI не обязан зеркалить footer) — effective audio всё равно режет footer.
- **Группы** меняют состояние карточек-участников целиком (off или один уровень громкости на всех членов). Кто не в группе — **не трогаем**. Старое правило «включили mic в группе → mute всем вне группы» — **неправильное, не повторять**.
- **Mic/volume слота пока runtime в store** (на рабочую сессию приложения): утром все линии неактивны, mic и sound по умолчанию **вкл**; оператор крутит состояния в течение дня — пишем в store, **не упираемся в REST persistence** mic/volume на этом этапе.
- UI страницы групп / broadcast — **отдельная задача**; в p2 только заложить понимание override.

#### Scope p2

- Обязательно: сетка **21** + layout карточки + dial/answer/cancel + call card для pinned + связь с футером + edit menu (queue/directory/move/swap).
- Out of scope p2: финальные цвета карточки, UI групп/broadcast, пагинация сетки.

### Часть 3 (2026-07-20) — Goose default + режимы mic / PTT в Media Devices

Вернуть настройки Goose на странице **Media Devices** (Main Settings **не трогаем**; `pushToTalkIsEnabled` там остаётся только для конференции).

#### UI (Media Devices, сверху над списком устройств)

1. Селектор **Goose по умолчанию** — из доступных goose (обычно 2); default = первый.
2. Селектор **режима**: `stateful` | `pushToTalk`.
3. Если режим PTT — селектор **scope**: `standard` | `activePinned` (это и есть «выбор слота» / active pinned, временно отключённый ранее).
4. UI на старых паттернах настроек (`wui-select` / сетка как MainSettings); стили не полировать.

#### Runtime

- Выбранный Goose используется для **завешенных**, footer mic и speak — не хардкод `readyGooseDevices[0]`.
- `mode` / `pttScope` применяются к выбранному Goose.
- Persist: **localStorage сейчас** → **REST API per user** (draft: `.ai/knowledge/wiki/backend-integration/goose-settings-api.md`). Миграция — отдельный этап.

#### Backend API (draft, 2026-07-20)

Scope **per user**. Target: уйти с localStorage (goose settings) и IM preferences `bindings` (клавиши линий).

- `GET/PUT /api/v1/me/goose-settings` — `preferredGooseModuleId`, `mode`, `pttScope`
- `GET/PUT /api/v1/me/goose-line-key-bindings` — normalized `gooseModuleId` + `keyIndex` 1..9, `standard` | `pinned-group`
- `groupIndex` 0..6 — тот же index, что pinned-calls groups API
- Orphan bindings при удалении контакта/группы — решает backend

Подробности: `.ai/knowledge/wiki/backend-integration/goose-settings-api.md`

#### PTT / activePinned / legacy

- `activePinned` PTT перевести на **новый** `usePinnedCallsPanelStore.activeSlotOrder` (не legacy `activePinnedCall`).
- Искоренять legacy там, где мешает (gooseEventHandler / override).
- Учесть ревью WUI-3825: в PTT mic только при press аппаратной speak; смена активной линии не unmute сама.
- На logout вызывать `usePinnedCallsPanelStore().reset()` (сейчас метод есть, вызова нет).
- 2026-07-20: при смене preferred Goose mid-call — rebind активных panel-сессий на новый goose (иначе звук пропадает до перезвона).

#### Wiki

- Обновить `devices.md` / `speakers-ptt.md` после стабилизации.

## Ограничения

- Не менять legacy store без явной необходимости.
- Не добавлять новые зависимости без согласования.
- Runtime `sessionId` не в REST.
- Цвета карточек — позже.
- FSD + public API; импорты через алиасы.
- Тесты/сборки — только с согласия.

## Связанные материалы

- Ветка: `feature/WUI-5185-p2`
- Макеты (чат 2026-07-17): сетка empty, offline, incoming/outgoing, active
- Wiki: `.ai/knowledge/wiki/domain/pinned-calls.md`, `.ai/knowledge/wiki/domain/calls.md`
- Часть 1 plan: `.ai/tasks/WUI-5185/implementation_plan_1.md`
- Часть 2 plan: `.ai/tasks/WUI-5185/implementation_plan_2.md`
- WidgetViewport plan: `.ai/tasks/WUI-5185/implementation_plan_3.md`
- Goose/PTT settings plan: `.ai/tasks/WUI-5185/implementation_plan_4.md`
- API draft: `.ai/knowledge/wiki/backend-integration/goose-settings-api.md`
- Код: `src/entities/pinned-calls`, `src/widgets/pinned-calls-panel`
- Паттерн меню/move ПБВ: `src/widgets/quick-call-panel`
- Shared menu/modal: `ContextMenu`, `ChangeContactsModal`
- Константы: `PINNED_CALLS_UI_SLOT_COUNT = 21`, `PINNED_CALLS_API_MAX_ORDER = 21` (backend 2026-07-23)
- 2026-07-17: токены `pinnedline-*` / `broadcast-*` из core `developerV` занесены в `light-1.css` / `lsDark-1.css` (+ `npm run generate:theme`).
- 2026-07-17: перед шагом 3 — в DEV для goose тот же fallback `audioinput`, что у handset (`use-devices-store`), если label модуля не матчится.

## Открытые вопросы (оставлены)

- Точный состав правой панели pinned call card (очередь завешенных vs пусто) — уточним при шаге call card.
- Нужно ли при upsert контакта всё ещё слать `volume`/`micState` в REST дефолтами, или поля игнорировать до отдельного решения persistence.
- Как надёжно отличить **наш** hold от **чужого** для иконки (`phonePauseM` vs `pauseM`) — подтвердить по полям сессии при шаге 1.

## Закрытые вопросы (часть 4)

- Local vs remote hold на слоте — иконка `pauseF` / `pauseM`; снятие hold только из call card для local (2026-07-23).
- Mic слота по умолчанию **off** (`micM`); on → `micF`. REST `micState` игнорируем при normalize — runtime в store (2026-07-23).

### Часть 4 (2026-07-23) — Стили карточки слота по Figma `pinnedline`

Макет: Figma DS `pinnedline` component set (`node-id=582-140`). Токены `comp/pinnedline/*` уже в теме.
Ориентир по mic/volume/mute: футер бродкаст-групп (WUI-5293). В макетах есть неточности — приоритет правилам ниже.

#### Оси визуала

- **Call/view state:** idle (нет сессии) | outgoing | incoming | active | hold | (voiceActive = active + VAD).
- **mic:** по умолчанию **off**; иконки `micF` / `micM`. Без сессии (idle) и в out/inc — mic приглушён и **не кликабелен** (как центр; volume в idle остаётся доступным). Включать mic можно после **active** (и hold) сессии.
- **speaker/audible:** volume > 0 / volume = 0.

#### Правая кнопка

- **Нет сессии:** кнопка действий (сценарии уже верные): idle → dial; outgoing → cancel; incoming → answer.
- **Есть сессия (active):** toggle звука линии. Прожата ⇔ volume = 0 (negcon + `volumeOffM`/`volumeOffF` как в группах); отжата → `volumeOnF`, фон зоны зависит от mic (off → серый inactive; on → зелёный callcon / карточка зелёная).
- **Hold:** снять hold можно только из call card, если hold **наш**. Иконка на слоте: наш hold — текущая пауза телефона; **чужой/remote hold** — `pauseM` (уточнение 2026-07-23).

#### Цвета (по аналогии с футером групп)

- mic off + audible → inactive (серый) фон зон.
- mic on + audible → active/callcon (зелёный) mic + середина + правая (speaker).
- volume = 0 → правая negcon; thumb слайдера neg; mic/середина по mic on/off.
- Правая кнопка (уточнение 2026-07-23):
  - idle (нет сессии): `bg/brd/icon` = `pinnedline-*-inactive-def`;
  - outgoing: `btn-waitcon` bg/brd/icon;
  - incoming / hold: фон как outgoing (`btn-waitcon` bg/brd); icon incoming = `btn-warncon-icon`; hold = `btn-waitcon-icon` + иконка `pauseF`.
- disable/edit — не трогаем empty/`+` в этом заходе (на макетах отдельно; оставить как есть).

#### Hold

- Иконка на слоте: наш hold — `pauseF`; чужой/remote — `pauseM`. Снятие hold только из call card для local.

#### VAD

- Делаем в этом заходе: индикация речи на слоте (как в группах: дорожка в free space слайдера по `remoteVoiceDetected` / `remoteVoiceLevel`).

#### Слайдер (уточнение 2026-07-23)

- Без сессии (idle): `sldr-bg-def` + `sldr-brd-inactive-dis` + `sldr-btn-def`.
- С сессией: `sldr-bg-def` + `sldr-brd-inactive-def` + `sldr-btn-def` (+ VAD позже).
- Размеры: radius scale `12px`, thumb width `16px` (radius thumb `8px` = half inline в либе).
- Mute (volume 0): thumb `sldr-btn-neg` — как в группах.
- Без лишнего opacity на mid/slider (idle яркий слайдер). Edit **не** меняет стили карточки — только появляется сетка/`+`; блокировка действий в handlers.
- Idle / out / inc / hold: mic+mid одинаково `bg/brd/icon/num/name-dis` (+ mic `btn-negcon-brd-dis`). Цвет только у правой кнопки. Connected active — зелёная матрица.
- Выделение: только active/hold. Mic on → только рамка. Mic off (inactive*) → рамка + `bg-inactive-hov` на зонах (status mute negcon не трогаем).
- **Индекс дубля pServed** (2026-07-23): если на одного абонента >1 слота — бейдж `slotIndex` в строке с номером (справа сверху). 18×18, radius 4, text 13/18. Токены: idle `slot/dis`, active mic off `slot/def`, mic on `slot/act`.

#### Out of scope части 4

- Менять empty/`+`/disable-edit визуал.
- Менять сценарии dial/answer/cancel/call card (только стили + иконки + VAD).
