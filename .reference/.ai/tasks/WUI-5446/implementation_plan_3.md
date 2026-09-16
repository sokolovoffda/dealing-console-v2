# Кейс: WUI-5446 — Activity Monitor

## Описание текущей части кейса

Третья часть — **нижняя «Очередь вызовов»**: живые сессии трубок + завешенных в горизонтальном strip, отдельная модель карточки (тона/иконки как у ПБВ/contact-card), сортировка по статусу, empty-state без клика, хедер через `WidgetHeader`. Конференции и стрелки листинга — вне этой части. Клик по карточке — открытие call-card с выбранной сессией (деталь API уточним на шаге клика).

## Контекст предыдущих частей

- `implementation_plan_1.md` — каркас страницы + stub очереди.
- `implementation_plan_2.md` — верхняя сетка, `features/contact-card`, BLF, presence (**закрыта**).

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/activity-monitor.md`
- `.ai/knowledge/wiki/domain/statuses.md`
- `.ai/knowledge/wiki/domain/quick-call-panel.md` — тона/иконки
- `.ai/knowledge/wiki/domain/calls.md` / pinned / devices — при наличии
- Код: `useSessionStore` (`queueSessions` **без** pinned — для AM нужна union), `features/call-card`, `features/contact-card` (device side L/R + goose)

# План реализации: очередь вызовов Activity Monitor

## Шаг 3.1: Хедер очереди через `WidgetHeader` + empty без клика

- **Описание:** В `ActivityMonitorQueuePanel` заменить самодельный title-row на `WidgetHeader` (иконка как в макете / `userGroupM` или из Figma, title «Очередь вызовов», без edit-кнопки). При пустой очереди — визуал как `EmptySetupPrompt` («Очередь пуста»), **без** клика/перехода в edit (prop `interactive: false` на shared prompt или отдельный non-button блок — минимально).
- **Файлы для изменений:** `ActivityMonitorQueuePanel.vue`; при необходимости `EmptySetupPrompt` (опциональный non-interactive режим).
- **Ожидаемый результат:** Хедер нижнего блока совпадает по компоненту с верхним; пустая очередь показывает заглушку без клика.
- **Проверка:** Ручной просмотр AM без сессий.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3.2: Модель списка сессий очереди AM (handset ∪ pinned)

- **Описание:** Widget-level composable: собрать сессии трубок + завешенных (не использовать голый `queueSessions`, он pinned исключает). Исключить конференции. Сортировка: `CONNECTED` → `ONHOLD` → `RINGING`/`PROGRESS`; внутри группы — порядок появления (FIFO / стабильный порядок store). Без priority.
- **Файлы для изменений:** `src/widgets/activity-monitor/model/use-activity-monitor-queue-sessions.ts` (+ export в model index).
- **Ожидаемый результат:** Реактивный отсортированный список session facades для strip.
- **Проверка:** Review + ручная проверка с handset и pinned сессиями.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да (кратко в `activity-monitor.md` — состав очереди и сортировка)

## Шаг 3.3: Карточка очереди (UI + tone/device side)

- **Описание:** Отдельный UI карточки очереди (не `ContactCard` 1:1 — в макете вертикальная колонка). По Figma `150:41510` / component `Abonent.Dark.Сonference.Big`:
  - размер ~**308×220**, padding **16×24**, gap **14**, radius **14**;
  - сверху иконка состояния **72** (`phoneCallF` / hold `phonePauseF|InvF` / стрелки L/R);
  - имя **24/32**, номер **20/28**, длительность **18/26**;
  - тона: **зелёный фон только у CONNECTED**; у остальных фон neutcon, цвет только у иконки. Токены цветов — от пользователя; пока нет в либе → те же, что у ПБВ `contact-card-tone`.
  Горизонтальный strip: `overflow-x-auto`, карточки `shrink-0` (макетный `wrap` не берём в v1). Сторона трубки L/R и goose — через иконки/mirror как в contact-card.
- **Файлы для изменений:** `ActivityMonitorQueuePanel.vue` + новый ui/model карточки в `widgets/activity-monitor` (или thin feature при явном переиспользовании — уточнить на старте шага).
- **Ожидаемый результат:** В strip реальные карточки вместо placeholder stubs.
- **Проверка:** Ручной визуальный review vs [Figma 150:41510](https://www.figma.com/design/GFGtv2rIBOwaXWZUOq2IoO/…?node-id=150-41510); L/R/goose на живых сессиях.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет (или да, если контракт карточки стабилен)

## Шаг 3.4: Клик → открыть call-card для сессии (handset / pinned)

- **Описание:** По клику выбрать сессию в очереди трубки и открыть карточку вызова **или** открыть/активировать call-card сценарий для завешенной. Конкретный store API согласовать по коду `useCallCardStore` / pinned panel на этом шаге. Пока без конференций. Также: клик по завешенной из ПБВ/AM `ContactCard` → `openPinnedPanelSession` (без goose карточка всё равно открывается).
- **Файлы для изменений:** queue panel/card + `use-contact-card-call` + вызовы call-card / pinned stores.
- **Ожидаемый результат:** Клик по карточке очереди / ContactCard с pinned-сессией приводит к call-card.
- **Проверка:** Ручные сценарии handset session + pinned session (ПБВ, AM сетка, AM очередь).
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да — клик-поведение очереди AM

## Шаг 3.5: Unit-тесты модели очереди (`useActivityMonitorQueueSessions`)

- **Описание:** AAA-тесты composable списка очереди AM. Покрыть бизнес-правила без UI/SIP:
  1. union handset `queueSessions` ∪ pinned `slotSessionIds` (без дублей по `sessionId`);
  2. исключение конференций (`session.conference` / conference room number);
  3. фильтр только `CONNECTED` | `ONHOLD` | `RINGING` | `PROGRESS`;
  4. сортировка групп: CONNECTED → ONHOLD → RINGING|PROGRESS; внутри группы — порядок появления (FIFO / стабильный Map);
  5. `isQueueEmpty` при пустом и непустом списке.
- **Файлы для изменений:** `src/widgets/activity-monitor/test/use-activity-monitor-queue-sessions.test.ts` (моки `useSessionStore` / `usePinnedCallsPanelStore` / `isConferenceRoomNumber` по паттерну соседних widget-тестов).
- **Ожидаемый результат:** Стабильные unit-тесты на контракт состава и порядка очереди; coverage логики composable ≥80%.
- **Проверка:** `npx vitest run src/widgets/activity-monitor/test/use-activity-monitor-queue-sessions.test.ts`
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3.6: Unit-тесты tone карточки очереди (`getActivityMonitorQueueCardTone`)

- **Описание:** AAA-тесты чистой функции tone/иконок (без монтирования Vue). Сценарии:
  1. **CONNECTED** handset → зелёный callcon root + `phoneCallF` (L) / mirror R;
  2. **CONNECTED** pinned / goose → `micLeftF` / `micRightF`, не phone;
  3. **ONHOLD** handset local/remote → `phonePauseF` / `phonePauseM` + waitcon icon class; pinned → `micPause*`;
  4. **RINGING/incoming** → стрелка + warncon icon (`pinnedline-btn-warncon`); **PROGRESS/outgoing** → стрелка + waitcon icon;
  5. не-CONNECTED root → временные токены `card-am-queue-bg/brd` (не callcon);
  6. device side R зеркалит стрелки/phone/mic.
- **Файлы для изменений:** `src/widgets/activity-monitor/test/activity-monitor-queue-card-tone.test.ts` (+ мок pinned store `isPinnedPanelSessionId` при необходимости).
- **Ожидаемый результат:** Tone/icon контракт зафиксирован тестами; регрессии mic vs phone и цветов incoming/outgoing ловятся сразу.
- **Проверка:** `npx vitest run src/widgets/activity-monitor/test/activity-monitor-queue-card-tone.test.ts`
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3.7: Component-тесты панели/карточки очереди + клик

- **Описание:** Vue Test Utils на UI-слой очереди (тонкие тесты, без WebRTC):
  1. `ActivityMonitorQueuePanel`: пустая очередь → `EmptySetupPrompt` «Очередь пуста», `interactive=false` (нет клика/emit);
  2. непустая → strip с карточками по `sessionId`;
  3. клик по handset-карточке → `openSessionInPreferredHandset(sessionId)`;
  4. клик по pinned-карточке → `openPinnedPanelSession(sessionId)`;
  5. `ActivityMonitorQueueCard` (smoke): рендер name/number/duration + data-test иконки; опционально проверка классов tone через stubbed session.
  - Не дублировать сценарии `ContactCard` / `openPinnedPanelSession` из ПБВ — они уже в `ContactCard.test.ts` (шаг 3.4).
- **Файлы для изменений:** `src/widgets/activity-monitor/test/ActivityMonitorQueuePanel.test.ts`, `ActivityMonitorQueueCard.test.ts` (все тесты слайса — в `widgets/activity-monitor/test/`).
- **Ожидаемый результат:** UI-контракт empty / strip / клик → call-card API покрыт; ручные проверки остаются для анимации TransitionGroup и живого SIP.
- **Проверка:** `npx vitest run src/widgets/activity-monitor/test`
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет (при желании — одна строка в `activity-monitor.md`, что очередь покрыта unit/component тестами)

## Вне этой части

- Конференции в очереди AM.
- Priority в сортировке.
- Стрелки горизонтального листинга (после дизайна).
- Pixel-perfect доводка после появления финальных DS-токенов (сейчас временные `card-am-queue-*` в `tokens.css`).
- Анимация `TransitionGroup` strip — только ручная проверка.