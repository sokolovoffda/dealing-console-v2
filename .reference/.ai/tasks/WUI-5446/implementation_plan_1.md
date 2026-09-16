# Кейс: WUI-5446 — Activity Monitor

## Описание текущей части кейса

Первая часть — каркас монопольной страницы «Монитор активности»: thin page + widget panel, верхняя сетка абонентов и нижняя панель «Очередь вызовов» по макету. Без финальных карточек очереди и без полноценных карточек ПБВ/BLF — только layout, заголовки, placeholder-ячейки и базовый entity/API слой подписок для следующих частей.

## Контекст предыдущих частей

- Предыдущих частей по WUI-5446 нет.
- Route `ActivityMonitor` и кнопка `M` уже есть, страница сейчас — `PageDevelopment.vue`.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/quick-call-panel.md`
- `.ai/knowledge/wiki/backend-integration/sip-webrtc.md`
- `.ai/knowledge/wiki/domain/statuses.md`
- `.ai/knowledge/wiki/frontend/routing.md`
- `.ai/knowledge/wiki/backend-integration/api-routing.md`
- `domain/activity-monitor.md` — пока не создана.

# План реализации: каркас страницы Activity Monitor

## Шаг 1: Entity `activity-monitor` — типы, API, normalizers

- **Описание:** Создать FSD-слайс `src/entities/activity-monitor` по паттерну `fast-dial` / `pinned-calls`. Добавить DTO/domain-типы panel и subscription (`schemaVersion`, `contactGuid`, `order`), константу размера верхней сетки `ACTIVITY_MONITOR_GRID_SIZE = 24` (по макету 6×4; при уточнении — поменять одной константой), normalizers для sparse `order` как cellIndex, API-клиент через `getAdditionalApiURL`: GET panel, POST subscription, PUT replace, PUT reorder, DELETE by contactGuid. Public API через `index.ts`.
- **Файлы для изменений:** `src/entities/activity-monitor/api/use-activity-monitor-api.ts`, `src/entities/activity-monitor/model/types.ts`, `src/entities/activity-monitor/model/normalizers.ts`, `src/entities/activity-monitor/index.ts`.
- **Ожидаемый результат:** Изолированный type/API layer без UI и без SIP/BLF.
- **Проверка:** Review импортов и соответствия контракту API из case. `npm run ts:check` — только после согласия.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: Store панели Activity Monitor (базовый)

- **Описание:** Добавить Pinia store `useActivityMonitorStore`: `panel`, `subscriptions`, `loading`, `error`, `isEditMode`, `fetchPanel`, setters edit mode, построение массива UI-ячеек верхней сетки длины `ACTIVITY_MONITOR_GRID_SIZE` по sparse `order` (пустые ячейки между заполненными). Методы add/replace/reorder/delete можно заготовить под API, но UI действий add/remove в этой части не подключать (или только no-op stubs). Не трогать SIP/BLF и очередь сессий.
- **Файлы для изменений:** `src/entities/activity-monitor/model/use-activity-monitor-store.ts`, `src/entities/activity-monitor/index.ts`.
- **Ожидаемый результат:** Store загружает panel и отдаёт grid cells для UI-скелета.
- **Проверка:** Review по коду. Unit tests — только после согласования.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Widget `activity-monitor` — layout верхней сетки и нижней панели

- **Описание:** Создать `src/widgets/activity-monitor` с public API. Панель: `WidgetHeader` («Монитор активности», иконка `mSquareM` / аналог из макета) + кнопка edit (toggle `isEditMode`, без add-flow). Контент колонкой: (1) верхняя CSS-grid сетка placeholder-ячеек (заполненные — простой placeholder с guid/order или пустой слот; пустые — blank / plus только визуально в edit без модалки); (2) нижний блок «Очередь вызовов» с заголовком и горизонтальным рядом placeholder-карточек (фиксированные заглушки или пустой strip — без привязки к `queueSessions`). Стили/отступы по макету: gap ~8px, карточки верхней сетки шириной как ПБВ (~308). Не импортировать `QuickCallContactCard` в этой части.
- **Файлы для изменений:** `src/widgets/activity-monitor/ui/ActivityMonitorPanel.vue`, при необходимости `ActivityMonitorGrid.vue`, `ActivityMonitorQueuePanel.vue`, `src/widgets/activity-monitor/index.ts`.
- **Ожидаемый результат:** Виджет рисует двухзонный layout страницы по макету на placeholder-данных / store cells.
- **Проверка:** Визуальный review шаблона; ручной просмотр в Electron/browser — после согласия на запуск.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: Подключить монопольную страницу и router

- **Описание:** Создать `ActivityMonitorPage.vue` по паттерну `PinnedCallsPage` / `BroadcastGroupsPage`: `WidgetViewportProvider(MONOPOLY_WIDGET_VIEWPORT)` + `ActivityMonitorPanel`. В `src/app/router/index.ts` заменить `PageDevelopment` на новую страницу для `ActivityMonitor`. При mount страницы/панели вызывать `fetchPanel`. Не добавлять в workspace widget registry.
- **Файлы для изменений:** `src/pages/main/ui/ActivityMonitorPage.vue`, `src/app/router/index.ts`.
- **Ожидаемый результат:** Кнопка `M` открывает реальную страницу Activity Monitor с сеткой и нижней панелью.
- **Проверка:** Ручной переход на `/main/monopoly/activity-monitor` после согласия на запуск. При недоступном API — корректный loading/error/empty skeleton без падения.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да (опционально в конце части): завести черновик `domain/activity-monitor.md` + запись в `log.md` / `index.md` — только если пользователь подтвердит стабильность каркаса.

## Вне этой части (следующие планы)

- Карточки нижней очереди (источник: трубки + завешенные и т.д.; порядок/вид — уточнение).
- Карточки верхней сетки = ПБВ (`QuickCallContactCard`) + возврат BLF presence/subscribe lifecycle на Activity Monitor.
- Полный edit-flow: add contact modal, reorder, delete через API.
- Тесты — отдельным шагом после согласования.
