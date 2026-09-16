# WUI-5446 — Activity Monitor

## Исходная задача

Activity Monitor. Привести в соответствие с дизайном, реализовать функционал.

Монопольная страница «Монитор активности» (кнопка `M` в header):

- **Верх:** сетка абонентов с BLF-подписками (то, что вырезали из ПБВ ради оптимизации). Пользователь добавляет ограниченное число абонентов; позиции/`order` хранятся на backend.
- **Низ:** текущая очередь вызовов со всех трубок, завешенных и т.д. Порядок и финальный внешний вид карточек очереди — позже.

Макет: [Figma node 150:40178](https://www.figma.com/design/JTPlAtfAfY1mawkWPsejsY/%D0%9C%D0%B0%D0%BA%D0%B5%D1%82%D1%8B.-%D0%94%D0%B8%D0%BB%D0%B8%D0%BD%D0%B3%D0%BE%D0%B2%D1%8B%D0%B9-%D0%BF%D1%83%D0%BB%D1%8C%D1%82-v3.0?node-id=150-40178).

Backend API (additional backend, `/api/v1/me/...`):

- `GET /api/v1/me/activity-monitor` → `{ schemaVersion, subscriptions: [{ contactGuid, order }] }`
- `POST /api/v1/me/activity-monitor/subscriptions` → создать подписку `{ contactGuid, order }`
- `PUT /api/v1/me/activity-monitor/subscriptions` → replace списка
- `PUT /api/v1/me/activity-monitor/subscriptions/reorder` → `{ fromOrder, toOrder }`
- `DELETE /api/v1/me/activity-monitor/subscriptions/{contactGuid}`

Jira: Feature Request, статус «Анализ», ветка `feature/WUI-5446`.  
Связанный backend-коммит dealing-admin: `feat: WUI-5445 WUI-5446 API Activity Monitor and Favorites`.

## Уточнения пользователя

- 2026-08-26: Первая часть — страница, верхняя сетка и нижняя панель (каркас). Затем карточки нижней панели. Затем карточки верхней сетки — такие же, как в ПБВ (`cardDefDeal` / `QuickCallContactCard`).
- 2026-08-26: Вверху пользователь добавляет абонентов; на всех абонентов в списке — подписка BLF (вынесена из ПБВ).
- 2026-08-26: Внизу — текущая очередь со всех трубок, завешенных и т.д.; порядок и внешний вид — позже.
- 2026-08-26: Реализация по паттерну остальных виджетов / монопольных страниц (`PinnedCallsPage` / `BroadcastGroupsPage`: thin page + `WidgetViewportProvider` + widget panel).
- 2026-08-26: Route уже есть: `monopoly/activity-monitor`; кнопка `M` в `WorkspaceSwitchers` уже ведёт на `ActivityMonitor`.
- 2026-08-26: Часть 1 каркаса принята («пока все отлично»). Дальше — верхняя часть: действия с карточками, карточки как в ПБВ, BLF; нет EmptySetupPrompt при пустой верхней панели (нужно как в ПБВ).
- 2026-08-26: Клик по карточке AM вне edit — звонок как в ПБВ.
- 2026-08-26: Reorder входит в часть 2 (верхняя сетка).
- 2026-08-26: Presence/subscriber visual — вариант **A**: вернуть в shared карточку; BLF-подписки только на Activity Monitor. Карточку сразу вынести в `features/contact-card` (не путать с `features/call-card` — трубка footer).
- 2026-08-26: Часть 2 (верхняя сетка + BLF + shared ContactCard) **закрыта**. Дальше — нижняя «Очередь вызовов».
- 2026-08-26 (очередь, черновик до макетов):
  - Источник: вся очередь приложения = сессии **трубок** + **завешенных**. Конференции — **не в этой части**.
  - Сортировка (без priority пока): **active (CONNECTED) → hold (ONHOLD) → incoming/outgoing (RINGING/PROGRESS)**. Priority добавится позже.
  - UI: принцип как у ПБВ / contact-card тона (цвета и иконки те же), но **отдельная модель карточки очереди** (не тот же `ContactCard` 1:1).
  - Нужна поддержка стороны трубки (L/R) и стороны гусиного микрофона.
  - Лейаут: горизонтальный скролл, не ломает вёрстку; стрелки листинга — позже (запрос дизайнеру).
  - Макеты Figma пользователь предоставит отдельно.
- 2026-08-26 (очередь, уточнения):
  - Клик по карточке очереди (направление, деталь уточним в реализации): открыть карточку вызова с выбранной сессией в очереди трубки **или** карточку вызова для завешенной сессии.
  - Empty: как `EmptySetupPrompt` сверху, но **без клика**; текст «Очередь пуста».
  - Внутри группы статусов — **просто по порядку появления** (FIFO), без отдельного правила incoming vs outgoing.
  - Макет очереди: Figma node `150:41510` — https://www.figma.com/design/JTPlAtfAfY1mawkWPsejsY/…?node-id=150-41510
  - Хедер нижнего блока «Очередь вызовов» — через тот же `WidgetHeader`, что и верх («Монитор активности»), не самодельный row с иконкой.

- 2026-08-26 (очередь, Figma copy `GFGtv2rIBOwaXWZUOq2IoO` node `150:41510`):
  - Блок: title (icon 40 + «Очередь вызовов» heading 24/40) + content row `padding 16×8`, `gap 8` (в макете ещё `wrap` — в продукте сначала horizontal scroll без ломания вёрстки).
  - Карточка `Abonent.Dark.Сonference.Big`: **308×~220**, `padding 16×24`, `gap 14`, `radius 14`, колонка по центру.
  - Состав карточки сверху вниз: иконка состояния **72**, имя **24/32**, номер **20/28**, таймер **18/26** (`00:00:30`).
  - Примеры состояний в макете: active/callcon (зелёный bg `#109310` / brd `#35E935`, текст тёмный, `phoneCallF`); hold тёмный (`phonePauseF` / `phonePauseInvF`); ringing/progress стрелки `arrowSouthEastM` / `arrowSouthWestM` (сторона устройства).
  - Ссылка: https://www.figma.com/design/GFGtv2rIBOwaXWZUOq2IoO/…?node-id=150-41510
- 2026-08-26 (очередь, цвета):
  - Названия токенов цветов для карточек очереди **скажет пользователь**. Если токенов ещё нет в либе — временно брать **те же цвета/токены, что у карточки ПБВ** (`contact-card-tone` / card-state).
  - **Фон меняется только у активной (CONNECTED) сессии** — зелёный callcon. У hold / incoming / outgoing фон остаётся нейтральным (тёмный neutcon); **подкрашивается только иконка** (hold — жёлтый/waitcon, стрелки — warn/neg как в макете).
- 2026-08-27 (очередь, клик / call-card):
  - Сейчас **не открывается карточка вызова** при клике по завешенной сессии и из **ПБВ**, и из **монитора активности** (верхняя сетка / очередь). Закрыть на шаге **3.4** вместе с кликом по карточке очереди AM (handset + pinned).
  - Очередь AM: иконки завешенных/goose совпадают с contact-card (`mic*`); у strip — лёгкая анимация появления/исчезновения карточек.
  - Решение 3.4: `openPinnedPanelSession` для pinned (ПБВ/AM ContactCard + очередь AM); `openSessionInPreferredHandset` для handset в очереди AM; goose не обязателен для открытия существующей pinned-сессии.

## Ограничения

- Не добавлять Activity Monitor в `workspaceWidgetRegistry` (только monopoly через header), пока продукт не попросит иное.
- BLF presence возвращается на эту страницу, не в ПБВ.
- Карточки верхней сетки должны совпадать с ПБВ визуально; BLF-статусы — отдельно от self-status ПБВ.
- Финальный порядок/дизайн карточек нижней очереди — часть 3 (после макетов).
- Конференции в нижней очереди AM — вне текущего scope.
- Тесты писать только после согласования с разработчиком (по правилам проекта).

## Связанные материалы

- Figma: node `150:40178` (grid ~24 `cardDefDeal` сверху, блок «Очередь вызовов» снизу).
- Скриншот макета в чате (6×4 сетка + горизонтальная очередь).
- Комментарий в Jira (Митричев Сергей): «api - список подписок BLF абонентов с позициями как в ПБВ».
- Паттерны: `PinnedCallsPage`, `pinned-calls-panel`, `quick-call-panel`, `fast-dial`.
- BLF how-to: `.ai/tasks/WUI-4733/implementation_plan_2.md` (шаг 3), живой код `PinnedCallsCards.subscribeToContacts`, wiki `sip-webrtc.md` / `statuses.md`.
- Presence/subscriber visual: `.ai/tasks/WUI-4864/*` (вырезано из текущего ПБВ вместе с подписками).
- Wiki: `domain/quick-call-panel.md`, `backend-integration/sip-webrtc.md`, `domain/statuses.md`, `frontend/routing.md`.
- Wiki `domain/activity-monitor.md` пока отсутствует.

## Открытые вопросы

- Размер верхней сетки: принято **24** (`ACTIVITY_MONITOR_GRID_SIZE`) по макету.
- Lifecycle BLF: подписывать только пока открыт AM.
- ~~Presence/subscriber visual~~ → shared карточка (A), подписки только на AM; карточка сразу в `features/contact-card` (2026-08-26).
- Размещение: `features/contact-card` (не `call-card`).
- Очередь (часть 3):
  - ~~empty / sort / header / карточка / клик~~ — сделано в шагах 3.1–3.4.
  - тесты: шаги **3.5–3.7** в `implementation_plan_3.md` (sessions / tone / panel+click).
  - стрелки горизонтального листинга — ждут дизайнера.
  - финальные DS-токены фона/бордера очереди — пока временные `card-am-queue-*`.
- Figma: node `150:40178` (весь AM), node `150:41510` (очередь).
