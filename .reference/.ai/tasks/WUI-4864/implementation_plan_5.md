# Кейс: WUI-4864 — структурный cleanup QuickCallPanel

## Описание текущей части кейса

После упрощения статусов карточек (без presence/subscriber/подписок) разгружаем `QuickCallPanel.vue` и приводим edit UX карточки к shared `ContextMenu`.

Уточнения от 2026-07-14:

- Стили сетки / rename legacy CSS — позже.
- Watch с refetch fast-dial на смену таба оставляем.
- Priority группы на карточку пока не прокидываем: на backend ещё нет.
- Клик по карточке в edit mode не должен запускать звонок/открытие сессии (текущее поведение — баг); допустим только select в move mode.
- Меню карточки — shared `ContextMenu` + `useContextMenu`, папку `quick-call-contact-card-menu` удалить.
- Иконки пунктов меню пока одинаковые placeholder’ы, пользователь поправит позже.
- Открытие меню — только kebab в edit mode (без ПКМ).
- Delete — destructive стиль иконки/текста.
- Тесты — отдельным финальным шагом.

## Контекст предыдущих частей

- `implementation_plan_1.md` — статусы карточек
- `implementation_plan_2.md` — сетка и edit mode
- `implementation_plan_3.md` — перемещение контактов
- `implementation_plan_4.md` — fast-dial layout

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/quick-call-panel.md`

# План реализации: cleanup QuickCallPanel

## Шаг 1: Вынести сценарии сетки в composable и убрать тонкие обёртки

- **Статус:** Выполнен и закоммичен.
- **Описание:** Создан `useQuickCallGridActions`: add/delete/move inside/move between/duplicate, helpers `applyActiveLayout` / `applyGroupLayout`. Тонкие `handleMoveToGroup` / `handleDuplicateToGroup` убраны; в template сразу `startMoveToGroup` / `startDuplicateToGroup`.
- **Файлы изменений:** `src/widgets/quick-call-panel/model/use-quick-call-grid-actions/**`, `src/widgets/quick-call-panel/ui/QuickCallPanel.vue`
- **Ожидаемый результат:** Panel — контейнер wiring; сценарии в model.
- **Проверка:** `vue-tsc` + eslint по изменённым файлам — ок.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: Разрезать UI на Header и Grid

- **Статус:** Выполнен и закоммичен.
- **Описание:** Вынести шапку с edit-кнопкой в `QuickCallHeader`, сетку ячеек (карточка / empty +) в `QuickCallGrid`. Panel собирает их и передаёт props/events. Стили и имена CSS-классов не переименовывать в этом шаге.
- **Файлы для изменений:** `src/widgets/quick-call-panel/ui/QuickCallHeader.vue`, `src/widgets/quick-call-panel/ui/QuickCallGrid.vue`, `src/widgets/quick-call-panel/ui/QuickCallPanel.vue`
- **Ожидаемый результат:** Template панели короткий; визуал без изменений.
- **Проверка:** `npm run ts:check`; ручная сверка UI.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Shared ContextMenu на карточке и фикс клика в edit mode

- **Статус:** Выполнен (ожидает коммита пользователя).
- **Описание:** В `QuickCallContactCard` заменить `QuickCallContactCardMenu` на shared `ContextMenu` + `useContextMenu` по паттерну `WorkspaceSwitchers` (kebab activator, `anchorMode: 'activator'`). Меню только в edit mode. Пункты: при нескольких группах — «Переместить в другую группу», «Дублировать в другую группу»; всегда — «Переместить», «Удалить». Иконки пунктов временно одинаковые placeholder; delete — destructive `iconClass`/`labelClass`. Удалить `src/widgets/quick-call-panel/ui/quick-call-contact-card-menu/**`. Исправить клик по карточке: в `isEditMode` не вызывать `toggleCall`; в edit + move — только `select`; в edit без move — no-op. View mode: звонок/сессия как сейчас.
- **Файлы для изменений:** `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue`; удаление `src/widgets/quick-call-panel/ui/quick-call-contact-card-menu/**`
- **Ожидаемый результат:** Edit-меню на shared ContextMenu; старое локальное меню удалено; клик в edit не звонит.
- **Проверка:** `npm run ts:check`; ручная проверка kebab/пунктов и клика в edit/view/move.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: Обновить тесты карточки

- **Статус:** Отложен в конец кейса (см. `implementation_plan_6.md` шаг 4 / отдельный план тестов).
- **Описание:** После стабилизации шагов 2–3 и UI-тонов обновить `QuickCallContactCard.test.ts` (и связанные): edit-клик без звонка, меню через shared ContextMenu / stub при необходимости, удалить ожидания старого menu API.
- **Файлы для изменений:** `src/widgets/quick-call-panel/test/QuickCallContactCard.test.ts`; при необходимости другие тесты слайса.
- **Ожидаемый результат:** Точечные тесты зелёные и соответствуют новому UX.
- **Проверка:** `npx vitest run` по затронутым тестам.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет (wiki по ПБВ — отдельно в конце кейса, когда попросишь)
