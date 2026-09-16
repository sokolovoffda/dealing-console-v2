# Кейс: WUI-5185 — New Pinned Calls Panel

## Описание текущей части кейса

Первая часть создает новую основу pinned calls для монопольной страницы: REST API layer, DTO/domain types, новый store, базовая сетка 15 слотов `5 x 3`, простые карточки, режим редактирования, добавление из выбранного контакта, очистка и swap-перемещение через API. Устройства/Goose/microphone selection в эту часть не входят.

## Контекст предыдущих частей

- Предыдущих частей по WUI-5185 нет.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/pinned-calls.md`
- `.ai/knowledge/wiki/domain/devices.md`
- `.ai/knowledge/wiki/frontend/stores.md`
- `.ai/knowledge/wiki/backend-integration/im-preferences.md`

# План реализации: базовая REST-модель и сетка pinned calls

## Шаг 1: Добавить типы, normalizers и API-слой pinned calls

- **Описание:** Создать новый FSD-слайс для новой модели завешенных, ориентировочно `src/entities/pinned-calls`. Добавить DTO/domain-типы для panel, slots и groups, константу базовой UI-сетки на 15 слотов, normalizers для входящего REST panel и payload builders для upsert/clear/reorder/group member. Добавить `use-pinned-calls-api.ts` по паттерну `fast-dial`, используя `/api/v1/me/pinned-calls` как основной endpoint текущего пользователя. Админские `/users/{userId}` endpoint'ы в первой части не подключать, если не потребуется.
- **Файлы для изменений:** `src/entities/pinned-calls/api/use-pinned-calls-api.ts`, `src/entities/pinned-calls/model/types.ts`, `src/entities/pinned-calls/model/normalizers.ts`, `src/entities/pinned-calls/index.ts`.
- **Ожидаемый результат:** В проекте есть изолированный API/type layer новой REST-модели pinned calls без UI и без зависимости от старого `usePinnedCallsStore`.
- **Проверка:** Ручная проверка типов и импортов. `npm run ts:check` запускать только после отдельного согласия пользователя.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет.

## Шаг 2: Реализовать новый store панели завешенных

- **Описание:** Добавить новый Pinia store, например `usePinnedCallsPanelStore`, который хранит `panel`, `slots`, `groups`, `loading`, `saving`, `error`, `activeSlotOrder`, `isEditMode`. Store должен уметь `fetchPanel`, `upsertSlot`, `clearSlot`, `reorderSlots`, `updateGroup`, `addGroupMember`, `removeGroupMember`, `setActiveSlot`, `setEditMode`, а также строить 15 UI-ячеек по строковому порядку. Runtime `sessionId` в API не отправлять. В базовой версии при изменении `volume` и `micState` можно сразу применять состояние к найденной активной session logic, но без привязки устройств.
- **Файлы для изменений:** `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`, при необходимости `src/entities/pinned-calls/model/session-effects.ts`, `src/entities/pinned-calls/index.ts`.
- **Ожидаемый результат:** Новый store загружает panel из REST, нормализует его в 15 UI-слотов, обновляет локальное состояние по ответам API и не трогает старый store.
- **Проверка:** Ручная проверка API/store логики по коду. Точечные unit tests или `npm run ts:check` запускать только после согласия пользователя.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет.

## Шаг 3: Подключить базовую сетку на монопольной странице

- **Описание:** Создать или подключить новый widget/feature UI для монопольной страницы: сетка 15 слотов `5 x 3`, порядок по строкам (`1..3` первая строка, `4..6` вторая, далее до `15`), loading/error states, простые карточки для заполненных слотов и простые empty slots. Подключить загрузку `fetchPanel` при открытии страницы. Старую сетку `src/widgets/pinned-calls` не заменять глобально.
- **Файлы для изменений:** ориентировочно `src/widgets/pinned-calls-panel/**` или существующий модуль монопольной страницы после уточнения текущей структуры, public API `index.ts`, точка подключения монопольной страницы.
- **Ожидаемый результат:** На монопольной странице отображается новая базовая сетка из 15 слотов, заполненные слоты приходят из REST panel, пустые слоты видны как доступные позиции.
- **Проверка:** Ручная проверка страницы в браузере/dev server только после согласия пользователя на запуск. Без запуска — review шаблона и store bindings.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет.

## Шаг 4: Добавить базовые действия слотов и режим редактирования

- **Описание:** Реализовать `isEditMode` в UI: добавление выбранного контакта в пустой слот через `PUT /slots/{order}`, очистку слота через `{ clear: true }`, выбор активной карточки, переключение mic/volume на карточке с применением к session logic и сохранением в REST. Добавление пока только из selected contact; сложный picker контактов не делать.
- **Файлы для изменений:** новый UI модуль панели, `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`, при необходимости feature-компоненты для действий.
- **Ожидаемый результат:** Пользователь может включить режим редактирования, добавить выбранный контакт в пустой слот, удалить слот, выбрать карточку и изменить базовые `micState`/`volume`.
- **Проверка:** Ручная проверка сценариев add/clear/select/mic/volume после согласия на запуск dev server. Автотесты не добавлять без отдельного согласования.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет.

## Шаг 5: Реализовать swap-перемещение слотов через reorder API

- **Описание:** Добавить drag/drop или другой базовый UI reorder в режиме редактирования. Перемещение должно вызывать `PUT /slots/reorder` с `{ fromOrder, toOrder }`; по продуктовому решению трактуем это как swap местами. Локальное состояние обновлять по `PinnedCallsPanelDto` из ответа backend. Не делать локальный `clearSlot/updateSlot` как источник истины для reorder.
- **Файлы для изменений:** новый UI модуль панели, `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`.
- **Ожидаемый результат:** Заполненный слот можно переместить на пустой или занятый слот; занятый слот меняется местами через backend response.
- **Проверка:** Ручная проверка reorder на пустой и занятый slot после согласия на запуск dev server.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет.

## Шаг 6: Подготовить группы в store без отдельной страницы групп

- **Описание:** В рамках store оставить поддержку `groups` из REST panel и методов `updateGroup`, `addGroupMember`, `removeGroupMember`, но отдельную страницу групп не строить в этой части. Зафиксировать, что `group.index` хранится как backend index `0..6`, а пользовательские подписи могут быть `1..7` в будущей UI-странице. При очистке слота временно полагаться на backend cleanup; если backend не чистит members, добавить фронтовую очистку отдельной корректировкой после уточнения.
- **Файлы для изменений:** `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`, типы/normalizers при необходимости.
- **Ожидаемый результат:** Store готов к будущей странице групп, но базовая сетка не смешивает group UI с slot UI.
- **Проверка:** Ручная проверка методов по коду. API-сценарии групп проверять вручную после появления UI или отдельного согласия на тестовый вызов.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: после стабилизации контракта обновить `domain/pinned-calls.md` и `log.md`.
