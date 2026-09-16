# Кейс: WUI-4448-p2 — перевод рабочих столов на snapshots API и базовое редактирование раскладки

## Описание текущей части кейса

Нужно заменить моковый источник рабочих столов на snapshots API и добавить базовый интерфейс редактирования визуальной раскладки рабочих столов. Snapshot хранит только визуальную раскладку: `id`, `order`, `layout`, `widgets`. Widget snapshot содержит `type` и `position`, а `params` в snapshots не используются. Один и тот же widget type можно размещать на разных рабочих столах, но внутри одного рабочего стола дублировать widget type нельзя. Внутренняя бизнес-логика widgets и их stores не меняется. При создании snapshot/widget frontend не отправляет `id`; backend назначает ids сам.

Backend endpoints:

- `GET /api/v1/me/snapshots`
- `POST /api/v1/me/snapshots`
- `PUT /api/v1/me/snapshots/{id}`
- `DELETE /api/v1/me/snapshots/{id}`

`PUT` обновляет snapshot по id в path. Адрес swagger другой: http://webclientrtudev.satel.org:9996/ и http://webclientrtudev.satel.org:9996/api/openapi.json

## Ограничения реализации

- 2026-06-09: Не дробить понятную store/UI-логику на множество мелких helper-функций. Код должен оставаться человекочитаемым; helper допустим только если он убирает реальное дублирование, упрощает сложный блок или повторяет уже принятый паттерн проекта.

## Контекст предыдущих частей

- Предыдущих планов по `WUI-4448-p2` нет.
- `WUI-4733` и `WUI-4864` меняли панель быстрого вызова и ее stores; в этой задаче их бизнес-логику не менять.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/quick-call-panel.md`
- `.ai/knowledge/wiki/frontend/stores.md`
- `.ai/knowledge/wiki/frontend/routing.md`

# План реализации: snapshots API и базовое редактирование рабочих столов

## Шаг 1: Ввести API, типы и store рабочих столов

- **Описание:** Расширить `src/entities/workspace`: добавить backend DTO для `snapshots`, API composable на `axios` и общий helper `getAdditionalApiURL` для endpoints дополнительного backend (`VITE_ADDITIONAL_API_URL`) с dev proxy `/api/v1`, Pinia/composable store для загрузки, хранения и поиска рабочих столов. Store должен уметь строить `WorkspaceViewModel` из snapshot, добивать ответ API клиентскими draft-слотами до трех рабочих столов и не экспортировать моки как основной source of truth. Create DTO не должен содержать `snapshot.id`, `widgets[].id` и `widgets[].params`; ids берутся только из backend response/read DTO. Read/update DTO тоже не должны содержать `widgets[].params`. `PUT` должен обновлять snapshot через `/api/v1/me/snapshots/{id}`. На этом шаге UI можно оставить почти без изменений, но подготовить публичный API entity через `index.ts`.
- **Файлы для изменений:** `vite.config.ts`, `src/env.d.ts`, `src/entities/workspace/model/types.ts`, новые файлы в `src/entities/workspace/api/`, новые файлы в `src/entities/workspace/model/`, `src/entities/workspace/index.ts`.
- **Ожидаемый результат:** В проекте появляется единый workspace store, который загружает `GET /api/v1/me/snapshots`, хранит loading/error, возвращает список рабочих столов и workspace по `id`, а при пустом или частичном `snapshots` добивает список draft-слотами до трех рабочих столов. Создание snapshot не отправляет ids и `params`.
- **Проверка:** Targeted lint по измененным workspace-файлам. Тесты не писать и не запускать на этом шаге; тесты будут отдельным финальным шагом кейса.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 2: Перевести header, routing и WorkspacePage на workspace store

- **Описание:** Заменить `mockWorkspaces/getWorkspaceById` в `WorkspaceSwitchers.vue` и `WorkspacePage.vue` на новый workspace store. Инициализировать загрузку snapshots на уровне layout или ближайшего workspace entrypoint, чтобы header и page использовали один source of truth. Настроить redirect с `/main` на первый workspace из store, когда snapshots/draft-слоты загружены. Для ошибки GET показывать простое ошибочное состояние workspace-раздела без fallback на моки.
- **Файлы для изменений:** `src/app/App.vue`, `src/app/layout/LayoutApplication.vue` или route-level entrypoint, `src/app/router/index.ts` / router guard при необходимости, `src/widgets/app-header/ui/WorkspaceSwitchers.vue`, `src/pages/main/ui/workspace/WorkspacePage.vue`.
- **Ожидаемый результат:** Рабочие столы в header и `WorkspacePage` отрисовываются из snapshots API/draft store, а не из `src/__mocks_/mock-workspaces.ts`.
- **Проверка:** `npm run ts:check` и targeted lint по измененным файлам. Тесты не писать на этом шаге.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 3: Добавить выбор layout и пустую сетку для draft-рабочего стола

- **Описание:** В `WorkspacePage.vue` или отдельном workspace UI-компоненте добавить состояние выбора layout. Если workspace draft или сохраненный snapshot без виджетов, показывать select layout; после выбора показывать пустую grid по выбранной раскладке. Смена layout должна сбрасывать widgets локально и не отправлять backend-запрос до добавления первого widget. Использовать текущие layout values: `two-equal`, `two-left-narrow`, `two-right-narrow`, `three-equal`.
- **Файлы для изменений:** `src/entities/workspace/model/` для draft actions, `src/pages/main/ui/workspace/WorkspacePage.vue` или новые внутренние UI-компоненты в `src/pages/main/ui/workspace/`.
- **Ожидаемый результат:** При пустом ответе API пользователь видит три пустых рабочих стола; при частичном ответе видит snapshots из API и недостающие draft-слоты до трех рабочих столов. Пользователь может выбрать layout и увидеть пустую сетку без сохранения на backend.
- **Проверка:** `npm run ts:check`, targeted lint и ручная проверка сценария. Тесты не писать на этом шаге.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 4: Добавить context menu для добавления widget в пустую ячейку

- **Описание:** Для пустых ячеек grid сделать button-like cell. При клике показывать простое context menu по примеру `QuickCallContactCardMenu.vue`. Меню должно показывать доступные widget types из registry, кроме настроек и кроме уже размещенных на текущем рабочем столе. При выборе widget добавлять его в выбранную позицию. Если это первый widget в draft/new layout, сохранить snapshot через `POST` create body без `snapshot.id`, без `widgets[].id` и без `widgets[].params`; если snapshot уже сохранен, обновить через `PUT`.
- **Файлы для изменений:** `src/pages/main/model/workspace-widget-registry.ts` при необходимости добавить labels/metadata, новые UI-компоненты в `src/pages/main/ui/workspace/`, workspace store actions.
- **Ожидаемый результат:** Пользователь может добавить widget в пустую ячейку, дубликаты widget type в одном workspace невозможны, первый widget создает snapshot на backend без отправки frontend ids и `params`.
- **Проверка:** `npm run ts:check`, targeted lint и ручная проверка сценария. Тесты не писать на этом шаге.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 5: Добавить удаление widget и удаление пустого snapshot

- **Описание:** В режиме редактирования добавить крестик на каждом размещенном widget. Отдельного backend endpoint для удаления widget нет, поэтому при удалении widget обновлять локальный workspace сразу и сохранять новый состав `widgets` всего snapshot через `PUT`. Если удален последний widget, вызвать `DELETE` для snapshot, перевести workspace в draft с выбранной layout и показывать пустую раскладку. Уведомления не добавлять; при ошибке логировать и оставить локальное состояние как есть.
- **Файлы для изменений:** workspace UI-компоненты, workspace store actions/API delete.
- **Ожидаемый результат:** Widget удаляется из layout без debounce и без отдельного delete-widget запроса; последний widget удаляет snapshot на backend и оставляет пустую выбранную grid на клиенте.
- **Проверка:** `npm run ts:check`, targeted lint и ручная проверка сценария. Тесты не писать на этом шаге.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 6: Финальные проверки и обновление project wiki

- **Описание:** Добавить/обновить тесты по завершенной модели и UI: workspace store/API, `WorkspacePage`, header switcher, layout select, добавление/удаление widget. Drag and drop в текущей части не реализуется и не проверяется. Затем запустить доступные проверки по измененной области: точечные tests workspace store/UI, `npm run ts:check`, targeted lint по измененным файлам. После успешной реализации обновить долгоживущую память о workspace snapshots: зафиксировать, что snapshots управляют только визуальной раскладкой, widget stores общие, backend source of truth — `/api/v1/me/snapshots`, при пустом ответе создаются три draft-рабочих стола, ids snapshot/widget назначает backend, а `params` в snapshot widgets не используются.
- **Файлы для изменений:** `.ai/knowledge/wiki/frontend/routing.md` или новая/существующая страница про workspace при необходимости, `.ai/knowledge/wiki/frontend/stores.md`, `.ai/knowledge/wiki/log.md`, возможно `.ai/knowledge/wiki/index.md` если появится новая страница.
- **Ожидаемый результат:** Проверки пройдены или проблемы явно описаны; wiki отражает новую стабильную модель snapshots/workspaces.
- **Проверка:** Повторный просмотр обновленных wiki-страниц; команды проверки из описания.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Да: workspace snapshots, frontend store/routing, log.
