# Кейс: WUI-4864 — статусы карточек панели быстрого вызова

## Описание текущей части кейса

Первая часть WUI-4864: добавить отображение расширенных статусов карточек панели быстрого вызова без действий по клику.

Текущая карточка `QuickCallContactCard` уже отображает базовые `online/offline` по SIP/BLF presence через `useContactCardPresence`. Нужно добавить отдельный слой звонкового статуса карточки поверх presence, чтобы визуально различать активные состояния абонента и звонка.

Клик по карточке, контекстное меню, `pickup()`, `switchToCall()` и переходы в call manager в этой части не реализуются.

## Контекст предыдущих частей

- `../WUI-4733/implementation_plan_1.md` — базовый стор табов панели быстрого вызова: табы переведены на backend-группы, контакты активной группы грузятся отдельно виджетом, preferences не используются как source of truth.
- `../WUI-4733/implementation_plan_2.md` — базовая карточка контакта панели быстрого вызова: добавлены `online/offline`, visual tokens `priority -> presence -> colors`, SIP/BLF-подписка контактов активной группы.
- Шаг 1 текущего плана выполнен и закоммичен: FSD-структура исправлена, логика панели быстрого вызова вынесена в `src/widgets/quick-call-panel`, workspace-specific UI сгруппирован в `src/pages/main/ui/workspace`.

## Актуальная структура после FSD-правок

- `src/widgets/quick-call-panel/` — самостоятельный widget-slice панели быстрого вызова.
- `src/widgets/quick-call-panel/ui/QuickCallPanel.vue` — контейнер панели быстрого вызова.
- `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue` — карточка контакта панели быстрого вызова.
- `src/widgets/quick-call-panel/model/` — модель панели быстрого вызова: presence, загрузка контактов группы, подписка на статусы, visual tokens карточки.
- `src/widgets/quick-call-panel/test/QuickCallContactCard.test.ts` — тест карточки.
- `src/pages/main/model/workspace-widget-registry.ts` — registry workspace-виджетов на уровне страницы.
- `src/pages/main/ui/workspace/` — workspace page и page-level adapters.
- `src/pages/main/ui/workspace/workspace-widgets/` — adapters для workspace slots.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/quick-call-panel.md`
- `.ai/knowledge/wiki/domain/statuses.md`
- `.ai/knowledge/wiki/backend-integration/sip-webrtc.md`
- `.ai/knowledge/wiki/frontend/stores.md`

# План реализации: первая часть WUI-4864 — статусы карточек ПБВ

## Шаг 1: FSD-структура панели быстрого вызова

- **Статус:** Выполнен и закоммичен.
- **Описание:** ПБВ вынесена в самостоятельный widget-slice `src/widgets/quick-call-panel`; workspace-specific UI сгруппирован в `src/pages/main/ui/workspace`; устаревший `src/widgets/workspace-widget` удален.
- **Файлы изменений:** `src/widgets/quick-call-panel/**`, `src/pages/main/model/workspace-widget-registry.ts`, `src/pages/main/ui/workspace/**`, `src/pages/main/ui/index.ts`, `src/pages/main/index.ts`, route imports.
- **Ожидаемый результат:** Структура FSD приведена в порядок без изменения поведения приложения.
- **Проверка:** Выполнена на этапе шага: targeted tests, `npm run ts:check`, targeted lint, общий тестовый прогон.
- **Коммит после шага:** Да, коммит сделан пользователем.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 2: Добавить модель вычисления звонкового статуса карточки

- **Описание:** Создать widget-level модель/composable для статуса карточки панели быстрого вызова, например `useContactCardStatus`. Модель должна возвращать отдельный `cardStatus`, не заменяя `ContactPresence`. Предварительный набор статусов: `offline`, `online`, `ringing`, `ringing-self`, `in-call`, `in-call-self`, `hold`. Источники: `useContactCardPresence`, `useSessionStore().getPreferredSessionByPServed(...)`, `useContactStatusState().findLinesByInternalNumber(...)`, `STATE`, `CallStatusState`. Приоритет: локальная сессия текущего пользователя выше BLF-линий; если локальной сессии нет, использовать BLF-линии; если звонкового статуса нет, fallback в `online/offline`.
- **Файлы для изменений:** новый модуль в `src/widgets/quick-call-panel/model/`, вероятно `use-contact-card-status/use-contact-card-status.ts` и `index.ts`; тест рядом с моделью, например `src/widgets/quick-call-panel/model/use-contact-card-status/use-contact-card-status.test.ts`.
- **Ожидаемый результат:** Статус карточки вычисляется отдельно от визуального компонента и покрыт unit-тестами без изменения поведения клика.
- **Проверка:** Точечный `vitest` по новой модели. Тестовые сценарии: отсутствие `internalNumber`; registered online без звонка; локальные `STATE.RINGING`, `STATE.PROGRESS`, `STATE.CONNECTED`, `STATE.ONHOLD`; BLF `CallStatusState.EARLY`, `CONFIRMED`, `HOLD`; несколько BLF-линий с приоритетом более важного статуса.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 3: Подключить статус к visual tokens и карточке

- **Описание:** Расширить visual tokens карточки так, чтобы текущая структура `priority -> presence -> colors` сохранилась, но появился отдельный слой токенов/классов для звонкового `cardStatus`. Обновить `QuickCallContactCard.vue`: использовать `cardStatus`, добавить стабильный `data-card-status`, визуальную status-иконку/индикатор и классы статуса. Не добавлять `@click` и не менять бизнес-поведение карточки. Если финальный макет статусов не определен, использовать минимальную визуализацию на существующих цветах/иконках и оставить структуру для будущей замены токенов.
- **Файлы для изменений:** `src/widgets/quick-call-panel/model/contact-card-tone/contact-card-tone.ts`, `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue`, `src/widgets/quick-call-panel/test/QuickCallContactCard.test.ts`.
- **Ожидаемый результат:** Карточка визуально различает `offline/online` и звонковые статусы, старые `online/offline` сценарии остаются валидными, клик по карточке не получает новой логики.
- **Проверка:** Точечный `vitest` по `QuickCallContactCard`. Тестовые сценарии: `data-presence` сохраняется; `data-card-status` соответствует модели; для звонкового статуса отображается status-иконка/индикатор; номер и имя остаются видимыми; отсутствие статуса корректно отображает fallback.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 3.1: Упростить visual contract карточки перед финальными проверками

- **Описание:** Убрать отдельный слой `CONTACT_CARD_STATUS_TONES` и отдельный визуальный индикатор статуса. Сделать единый visual contract карточки: `CONTACT_CARD_TONES[priority][cardStatus]`. `CONTACT_PRESENCES` оставить только как модель базового SIP/BLF presence и источник fallback для `useContactCardStatus`; визуальное оформление карточки должно выбираться по итоговому `cardStatus`, а не по `presence`. В `QuickCallContactCard.vue` оставить `data-presence` для диагностики/обратной проверки и `data-card-status` для итогового статуса, но не добавлять отдельный status indicator. Будущие иконки статусов должны подключаться через тот же `ContactCardTone`, без второго status-tone контракта.
- **Файлы для изменений:** `src/widgets/quick-call-panel/model/contact-card-tone/contact-card-tone.ts`, `src/widgets/quick-call-panel/model/use-contact-card-status/use-contact-card-status.ts`, `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue`, `src/widgets/quick-call-panel/test/QuickCallContactCard.test.ts`, при необходимости `src/widgets/quick-call-panel/model/use-contact-card-status/use-contact-card-status.test.ts`.
- **Ожидаемый результат:** Визуальная модель карточки не дублируется: background, border, text, base icon и будущая status icon берутся из одного `ContactCardTone`, выбранного по `cardStatus`. Для `offline` и `online` сохраняются текущие тона, остальные статусы получают свои варианты в той же структуре.
- **Проверка:** Точечный `vitest` по `useContactCardStatus` и `QuickCallContactCard`; `data-presence` сохраняется, `data-card-status` соответствует модели, классы карточки берутся из `CONTACT_CARD_TONES.default[cardStatus]`, отдельный status indicator отсутствует. Дополнительно targeted lint и `npm run ts:check`.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 4: Выполнить проверки и обновить project wiki по статусам ПБВ

- **Описание:** Запустить доступные проверки по измененной области: точечные `vitest` для новой модели и карточки, затем `npm run ts:check` и targeted lint по измененным файлам. После успешной реализации обновить долгоживущую память: зафиксировать модель `presence + cardStatus`, источники статусов и то, что первая часть WUI-4864 не добавляет действий по клику.
- **Файлы для изменений:** `.ai/knowledge/wiki/domain/quick-call-panel.md`, `.ai/knowledge/wiki/domain/statuses.md`, `.ai/knowledge/wiki/product/open-questions.md` при необходимости, `.ai/knowledge/wiki/log.md`; возможно `.ai/knowledge/wiki/index.md`, если появятся новые страницы.
- **Ожидаемый результат:** Проверки по первой части WUI-4864 пройдены или явно описаны причины сбоя; wiki отражает новую устойчивую модель статусов карточки ПБВ и не содержит выдуманных UX-сценариев клика.
- **Проверка:** Повторный просмотр обновленных wiki-страниц; команды проверки из предыдущего пункта.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Да: `domain/quick-call-panel.md`, `domain/statuses.md`, `log.md`; `product/open-questions.md` только если останутся вопросы по визуализации или будущему контекстному меню.

## Шаг 5: Разделить наши directional-статусы и статусы абонента в модели карточки

- **Описание:** Переработать `useContactCardStatus` так, чтобы модель явно возвращала разные слои: `presence`, `selfStatus`, `subscriberStatus` и итоговый `visualStatus` / `cardStatus` для выбора визуала. `selfStatus` должен описывать локальную SIP-сессию текущего пользователя с абонентом и сохранять направление: `incoming-self`, `outgoing-self`, `connected-self`, `conference-self`, `incoming-hold-self`, `outgoing-hold-self`, `conference-hold-self` и другие варианты, если они уже выводятся из `STATE` / session facade. `subscriberStatus` должен описывать BLF-состояние абонента относительно других: `incoming-subscriber`, `connected-subscriber`, `hold-subscriber` и т.п. Приоритет источников: `selfStatus` выше `subscriberStatus`; если обоих нет, fallback в `online/offline` по `presence`.
- **Файлы для изменений:** `src/widgets/quick-call-panel/model/use-contact-card-status/use-contact-card-status.ts`, `src/widgets/quick-call-panel/model/use-contact-card-status/use-contact-card-status.test.ts`; при необходимости выделить рядом типы/константы статусов в отдельный файл внутри `model`.
- **Ожидаемый результат:** Наши directional-статусы и статусы абонента не смешаны в один неявный enum; входящая и исходящая локальная сессия различаются; тесты отдельно покрывают self-сессии и BLF-состояния абонента.
- **Проверка:** Точечный `vitest` по `useContactCardStatus`: локальная сессия перетирает BLF; входящий self-вызов и исходящий self-вызов возвращают разные статусы; BLF работает при отсутствии локальной сессии; fallback в `online/offline` сохраняется.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 6: Упростить visual contract без дублирования self-статусов по priority

- **Описание:** Перестроить `contact-card-tone` по независимым слоям состояния, а не по полной матрице `priority -> status`. Базовые тоны хранить отдельно как `presence -> priority`: приоритет влияет только на `online/offline`. Наши сессии хранить отдельно как `selfStatus -> tone` без дублирования для каждого priority. Исключение: `incoming-self`, где high priority дает красный фон, а все остальные priority — оранжевый. Статусы абонента хранить отдельно как `subscriberStatus -> subscriberIcon`; они не выбирают фон карточки, а добавляют дополнительную иконку поверх базового `presence`-тона. `getContactCardTone` должен собирать итоговый tone по правилу: `incoming-self` с учетом high/default, другой `selfStatus` перетирает базовый фон фиксированным статусным цветом, иначе берется `presence`-тон по priority и при наличии `subscriberStatus` добавляется `subscriberIcon`.
- **Файлы для изменений:** `src/widgets/quick-call-panel/model/contact-card-tone/contact-card-tone.ts`, `src/widgets/quick-call-panel/model/contact-card-tone/contact-card-tone.test.ts`.
- **Ожидаемый результат:** `contact-card-tone.ts` содержит только реально нужные сущности: `presence`-тона по priority, self-тона без дублей, отдельную мапу subscriber-иконок и helper выбора входящего self-тона. Добавление новых priority-групп требует править только `online/offline`-тона и, при необходимости, правило high/non-high для `incoming-self`.
- **Проверка:** Unit-тесты tone-модели: `online/offline` берутся по priority; `incoming-self` high красный, остальные priority оранжевые; `outgoing/connected/conference/hold self` не зависят от priority; `subscriberStatus` добавляет только иконку и не меняет выбранный фон.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 7: Подключить упрощенный visual contract к `QuickCallContactCard`

- **Описание:** Обновить `QuickCallContactCard.vue`, чтобы компонент работал через итоговый visual contract и не знал имена иконок напрямую. Основная иконка должна получать `name` и classes из `tone.primaryIcon`. Дополнительная иконка статуса абонента должна отображаться только если visual contract возвращает `subscriberIcon`. Компонент должен использовать `presence`, `selfStatus`, `subscriberStatus`, сохранять диагностические атрибуты `data-presence`, `data-self-status`, `data-subscriber-status`. Устаревший агрегированный `cardStatus` и `data-card-status` больше не использовать. Действия по клику не добавлять.
- **Файлы для изменений:** `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue`, `src/widgets/quick-call-panel/model/use-contact-card-status/use-contact-card-status.ts`, `src/widgets/quick-call-panel/test/QuickCallContactCard.test.ts`, `src/widgets/quick-call-panel/model/use-contact-card-status/use-contact-card-status.test.ts`.
- **Ожидаемый результат:** Карточка отображает разные основные иконки для наших статусов, дополнительную иконку для статусов абонента, а `useContactCardStatus` возвращает только независимые слои `presence`, `selfStatus`, `subscriberStatus` без legacy-агрегации `cardStatus`.
- **Проверка:** Точечный `vitest` по `useContactCardStatus`, `contact-card-tone` и `QuickCallContactCard`: self-status icon name, subscriber additional icon, отсутствие дополнительной иконки без subscriberStatus, сохранение номера/имени, отсутствие `@click`, отсутствие legacy-использований `CONTACT_CARD_STATUSES` / `cardStatus`.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 8: Финальные проверки и обновление wiki после разделения статусов

- **Описание:** Запустить точечные тесты модели и карточки, `npm run ts:check`, targeted lint по измененным файлам. После успешной реализации обновить `domain/quick-call-panel.md`, `domain/statuses.md` и `log.md`: зафиксировать разделение `presence` / `selfStatus` / `subscriberStatus`, правило перетирания цвета нашей сессией, priority-цвета только для `online/offline`, исключение для `incoming-self` high/non-high, а также правило хранения icon names в visual contract.
- **Файлы для изменений:** `.ai/knowledge/wiki/domain/quick-call-panel.md`, `.ai/knowledge/wiki/domain/statuses.md`, `.ai/knowledge/wiki/log.md`.
- **Ожидаемый результат:** Проверки пройдены; wiki отражает новую модель без выдуманных действий по клику и без полной матрицы `priority -> status`.
- **Проверка:** Повторный просмотр wiki-страниц и командные проверки из описания.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Да: `domain/quick-call-panel.md`, `domain/statuses.md`, `log.md`.

## Шаг 9: Pixel perfect / финальная визуальная доводка

- **Описание:** Ручная финальная доводка цветов, размеров, отступов, расположения основной и дополнительной иконок по макету. Этот шаг выполняет пользователь самостоятельно после технической реализации статусов.
- **Файлы для изменений:** Будут определены пользователем при ручной доводке, вероятно `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue` и `src/widgets/quick-call-panel/model/contact-card-tone/contact-card-tone.ts`.
- **Ожидаемый результат:** Визуал карточек соответствует макету pixel perfect.
- **Проверка:** Ручная визуальная проверка пользователем.
- **Коммит после шага:** Да, если пользователь внесет изменения.
- **Нужно ли обновить project wiki:** Нет.
