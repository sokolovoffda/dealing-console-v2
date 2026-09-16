# WUI-4448-p2 — перевод рабочих столов на snapshots API и базовое редактирование раскладки

## Исходная задача

Перевести текущие моковые рабочие столы на backend snapshots API.

Backend endpoints:

- `GET http://webclientrtudev.satel.org:9996/api/v1/me/snapshots`
- `POST http://webclientrtudev.satel.org:9996/api/v1/me/snapshots`

POST create body одного snapshot не отправляет `id` snapshot и `id` widgets. Backend назначает ids сам:

```json
{
  "order": 0,
  "layout": "two-equal",
  "widgets": [
    {
      "type": "contacts",
      "position": 0
    }
  ]
}
```

GET response:

```json
{
  "schemaVersion": 1,
  "snapshots": [
    {
      "id": "workspace-1",
      "order": 0,
      "layout": "two-equal",
      "widgets": [
        {
          "id": "workspace-1-widget-1",
          "type": "contacts",
          "position": 0
        }
      ]
    }
  ]
}
```

Текущая реализация использует моки `src/__mocks_/mock-workspaces.ts`, экспортируемые через `src/entities/workspace/index.ts`. Страница рабочего стола `WorkspacePage.vue` получает workspace по `id`, строит grid по `layout` и рендерит компонент виджета через `workspace-widget-registry.ts`.

В задаче нужно сделать базовый интерфейс создания и редактирования виджетов на рабочих столах:

- если массив рабочих столов пустой, на каждом рабочем столе показывать select выбора раскладки;
- после выбора раскладки показывать пустую сетку;
- как только добавлен первый виджет, сразу сохранить раскладку на backend;
- каждое изменение сохраненной раскладки сохранять на backend;
- если пользователь в select выбирает другую раскладку, сбрасывать все виджеты и показывать пустую сетку, но не обновлять backend до добавления первого виджета в новой раскладке;
- в базовом режиме редактирования виджеты можно перетаскивать drag and drop;
- сохранение после drag and drop делать с небольшим debounce;
- удаление виджета из раскладки делать через крестик на виджете, без debounce и без уведомлений;
- если ячейка сетки пуста, при клике показывать простое context menu со списком виджетов, которых еще нет на данном рабочем столе;
- на одном рабочем столе нельзя дублировать виджеты;
- сетку желательно сделать на кнопках по примеру из панели быстрого вызова и context menu из `QuickCallContactCardMenu.vue`.

## Уточнения пользователя

- 2026-06-09: Snapshot — это визуальный клон компонента. Один и тот же widget можно размещать на разных рабочих столах, но сам widget обращается к одному и тому же store.
- 2026-06-09: Рабочие столы отвечают только за визуальную раскладку.
- 2026-06-09: Backend по snapshots другой, это ожидаемо.
- 2026-06-09: Перед финальным планом нужно задать уточняющие вопросы.
- 2026-06-09: Если `GET /me/snapshots` вернул пустой массив, нужно показывать три пустых рабочих стола.
- 2026-06-09: Если `GET /me/snapshots` вернул меньше трех snapshots, frontend должен дорисовать недостающие рабочие столы клиентскими draft-слотами до трех. Например, если пришел один snapshot, нужно показать его и еще два draft-рабочих стола.
- 2026-06-09: На backend для snapshots есть методы `GET`, `POST`, `PUT`, `DELETE`.
- 2026-06-09: Удаление snapshot/раскладки нужно делать через `DELETE`.
- 2026-06-09: В меню добавления можно показывать все widget types, кроме страницы настроек.
- 2026-06-09: После удаления последнего виджета нужно просто удалить snapshot на backend и показывать пустую выбранную раскладку в select/grid.
- 2026-06-09: При ошибках сохранения пока выбрать самый простой вариант обработки.
- 2026-06-09: Drag and drop нужен только внутри текущего рабочего стола.
- 2026-06-09: Drag and drop внутри рабочего стола исключён из текущей части реализации; пункт DnD удалён из плана, финальные проверки выполняются без него.
- 2026-06-09: Redirect можно делать на первый рабочий стол.
- 2026-06-09: Для этой ветки при создании не отправлять `id` snapshot и `id` widgets; backend назначает ids сам.
- 2026-06-09: Backend убрал `params` из widgets snapshots; frontend не должен отправлять или ожидать `params` в snapshot DTO.
- 2026-06-09: На backend есть удаление snapshot, но нет отдельного удаления widget. Удаление widget сохраняется обновлением всего snapshot через `PUT`; если удален последний widget, удаляется snapshot через `DELETE`.
- 2026-06-09: После создания snapshot из draft нужно явно заменить route на backend id созданного snapshot; после удаления последнего widget нужно заменить route на соответствующий draft id. Скрытый alias mapping в store не использовать.
- 2026-06-09: Основной backend приложения берется из env/`getAppURL`, но часть endpoints, включая snapshots, находится на дополнительном backend из `VITE_ADDITIONAL_API_URL`; такие API не должны строить URL через основной backend.
- 2026-06-09: Для дополнительного backend используется тот же bearer token, что и для остальных axios-запросов. Token должен попадать в `axios.defaults.headers.common.Authorization` сразу после `login` и `restore`, до загрузки snapshots.
- 2026-06-09: В dev/browser абсолютный URL дополнительного backend вызывает CORS preflight; bearer не отправляется в `OPTIONS`. Для dev нужен same-origin proxy `/api/v1/*` на `VITE_ADDITIONAL_API_URL`.

## Ограничения

- Не менять бизнес-логику внутренних stores виджетов: snapshots/workspaces управляют только визуальной раскладкой.
- Не допускать дубликаты `widget.type` в пределах одного рабочего стола.
- Один и тот же `widget.type` может быть размещен на разных рабочих столах.
- Не добавлять новые зависимости без отдельного согласования.
- Учитывать, что в текущей ветке приложенные файлы панели быстрого вызова еще не смержены.
- API snapshots находится на дополнительном backend: `/api/v1/me/snapshots` относительно `VITE_ADDITIONAL_API_URL`. На frontend использовать общий helper `getAdditionalApiURL` из `src/shared/url-helper`.
- Snapshots API использует общий axios bearer header, как `fetchContacts`; отдельный token для дополнительного backend не нужен.
- В dev snapshots API должен ходить как обычный same-origin `/api/v1/me/snapshots`, чтобы избежать CORS; Vite proxy направляет `/api/v1/*` на `VITE_ADDITIONAL_API_URL`.
- Widget в snapshot содержит только `id`, `type`, `position` при чтении/обновлении и только `type`, `position` при создании; `params` в snapshots не используются.
- При смене layout выбранный на клиенте пустой draft не сохраняется на backend до добавления первого виджета.
- Удаление виджета сохраняется сразу и без уведомлений.
- Отдельного backend endpoint для удаления widget нет; frontend пересобирает `widgets` без удаленного widget и сохраняет snapshot через `PUT`.
- Drag and drop в текущей части не реализуется.
- При пустом или частичном ответе API frontend добивает список рабочих столов клиентскими draft-слотами до трех.
- Страница настроек не является widget type для workspace snapshots.
- При удалении последнего виджета сохраненный snapshot удаляется через `DELETE`, а рабочий стол остается в клиентском draft-состоянии с выбранной layout.
- Drag and drop между рабочими столами не входит в задачу.

## Предварительное техническое направление

- API frontend логично разместить в `src/entities/workspace/api/`, рядом с `src/entities/workspace/model/types.ts`, потому что snapshot/workspace является доменной entity, а в проекте уже есть паттерн `entities/*/api`.
- Store состояния snapshots/workspaces логично разместить в `src/entities/workspace/model/`, например `use-workspace-store.ts`, чтобы заменить прямой экспорт моков и дать единый source of truth для header switchers и `WorkspacePage`.
- DTO лучше держать рядом с workspace types, но разделить backend shape и view model: backend возвращает `snapshots`, текущий UI оперирует `workspaces`/`WorkspaceViewModel`.
- Рендеринг по API должен заменить `mockWorkspaces/getWorkspaceById`: header получает список рабочих столов из store, `WorkspacePage` получает snapshot по route `workspaceId` и строит grid из `layout + widgets`.
- Для создания POST отправляет один snapshot без `snapshot.id`, без `widgets[].id` и без `widgets[].params`.
- При создании frontend не генерирует `snapshot.id` и `widget.id`; ids берутся из backend после создания/загрузки.

## Уточняющие вопросы перед финальным планом

1. Сколько рабочих столов должно быть доступно, если `GET /me/snapshots` вернул пустой `snapshots: []`: фиксированное количество слотов, один рабочий стол по умолчанию или список рабочих столов приходит из другого источника?
   - Ответ: показывать три пустых рабочих стола; если backend вернул меньше трех snapshots, дорисовать недостающие draft-рабочие столы до трех.
2. `POST /me/snapshots` создает только новый snapshot или работает как upsert/replace для существующего `id`?
   - Ответ: на backend есть `GET`, `POST`, `PUT`, `DELETE`; создание делать через `POST`, обновление через `PUT`.
3. Есть ли отдельный endpoint для удаления snapshot или удаления виджета сохраняется тем же `POST` с обновленным snapshot без удаленного widget?
   - Ответ: отдельного удаления widget нет. Если после удаления widget в snapshot остаются widgets, сохранять обновленный snapshot через `PUT`; если удален последний widget, удалять snapshot через `DELETE`.
4. Нужно ли при изменении порядка `order` рабочих столов поддерживать редактирование порядка в этой задаче, или `order` только читаем и сохраняем как есть?
   - Ответ: явно не уточнено; в плане считать порядок фиксированным и не добавлять UI изменения `order`.
5. Какие layout значения считаются доступными для выбора в select на первом шаге: текущие `two-equal`, `two-left-narrow`, `two-right-narrow`, `three-equal` или есть новые варианты из backend/swagger?
   - Ответ: явно не уточнено; в плане использовать текущие frontend layout values.
6. Какие widget types должны быть доступны в context menu базового интерфейса: все текущие `contacts`, `pinnedCalls`, `groups`, `callQueue`, `history`, `phonebook` или только часть?
   - Ответ: можно все, кроме страницы настроек.
7. Нужно ли добавлять новый рабочий стол пользователем, или в этой задаче только редактируем рабочие столы, которые уже есть/созданы клиентом при пустом ответе?
   - Ответ: явно не уточнено; в плане не добавлять UI создания дополнительных рабочих столов, использовать три draft-слота при пустом ответе и snapshots из API при непустом ответе.
8. При пустом ответе backend и выборе layout: должен ли frontend генерировать `id` для нового workspace/snapshot?
   - Ответ: нет, при создании snapshot frontend не отправляет `id`; backend назначает id.
9. Для `widget.id` frontend должен генерировать id или не отправлять id?
   - Ответ: не отправлять `widget.id`; backend назначает id.
10. Что делать при ошибке GET snapshots: показывать старые моки как fallback, пустое состояние с ошибкой или блокировать workspace-раздел?
   - Ответ: явно не уточнено; в плане выбрать простой вариант без fallback на моки: показывать ошибку загрузки workspace-раздела.
11. Что делать при ошибке POST/PUT сохранения: откатывать локальное изменение, оставлять локально и показывать ошибку, или пока без уведомлений только логировать?
   - Ответ: как проще пока; в плане выбрать простой вариант: оставить локально, логировать ошибку, без уведомлений.
12. Нужно ли сохранять layout после удаления последнего виджета? Это приведет к snapshot с пустым `widgets: []`, либо нужно считать такой workspace draft-состоянием и не отправлять пустую раскладку?
   - Ответ: просто удалять snapshot и показывать пустую выбранную раскладку.
13. Должен ли drag and drop работать только внутри текущего рабочего стола, или перетаскивание между рабочими столами тоже входит в задачу?
   - Ответ: только внутри текущего рабочего стола.
14. Нужно ли переводить на snapshots API верхний переключатель рабочих столов сразу, включая redirect с `/main` на первый workspace из API, или оставить текущий маршрут/redirect отдельным шагом?
   - Ответ: можно переводить сразу, redirect делать на первый рабочий стол.

## Связанные материалы

- 2026-06-09: Уточнение по стилю реализации: в рамках этой задачи не дробить понятную store/UI-логику на множество мелких helper-функций. Код должен оставаться человекочитаемым; helper допустим только если он убирает реальное дублирование, упрощает сложный блок или повторяет уже принятый паттерн проекта.
- `src/entities/workspace/model/types.ts` — текущие типы workspace/layout/widget.
- `src/entities/workspace/index.ts` — текущий публичный API workspace entity, сейчас экспортирует моки.
- `src/__mocks_/mock-workspaces.ts` — текущий моковый источник рабочих столов.
- `src/pages/main/ui/workspace/WorkspacePage.vue` — текущий рендер сетки рабочего стола.
- `src/widgets/app-header/ui/WorkspaceSwitchers.vue` — текущий переключатель рабочих столов по мокам.
- `src/pages/main/model/workspace-widget-registry.ts` — registry `widget.type -> component`.
- `C:/Users/d.sokolov/Desktop/projects-other-branches/dealing-console-ui/src/widgets/quick-call-panel/ui/QuickCallPanel.vue` — пример grid на кнопках в edit mode.
- `C:/Users/d.sokolov/Desktop/projects-other-branches/dealing-console-ui/src/widgets/quick-call-panel/ui/quick-call-contact-card-menu/QuickCallContactCardMenu.vue` — пример простого context menu.
