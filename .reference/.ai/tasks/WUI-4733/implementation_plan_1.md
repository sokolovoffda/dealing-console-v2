# Кейс: WUI-4733 — базовый стор табов панели быстрого вызова

## Описание текущей части кейса
План: базовый стор табов панели быстрого вызова.

Нужно заменить старую модель contact-tabs на backend-группы, где таб является группой контактов с backend:

```ts
type ContactTab = {
  id: string
  groupGuid: string
  name: string
  order: number
  enabled: boolean
}
```

Стор должен хранить только группы, а не контакты всех групп. Контакты активной группы должен загружать виджет панели быстрого вызова. Backend является source of truth, поэтому новая базовая логика не должна переносить `loadByPreferences()` и `saveByPreferences()`.

Основные части кейса:
- заменить модель табов на backend-группы;
- переписать `useContactTabs`;
- защитить инициализацию от повторных запросов;
- инициализировать табы на уровне layout;
- обновить `TabsBlock.vue` и `TabItem.vue`;
- подготовить `WorkspaceContactsWidget.vue` к загрузке контактов активной группы;
- убрать preferences из новой логики;
- проверить одинарную инициализацию, переключение табов, отсутствие повторных `/api/Group/list` и пустой список групп.

## Контекст предыдущих частей
Предыдущих планов по `WUI-4733` в `tasks/WUI-4733/` нет.

# План реализации: базовый стор табов панели быстрого вызова

## Шаг 1: Заменить модель табов на backend-группы
- **Описание:** Переписать типы `contact-tabs` под минимальную модель backend-группы: `id`, `groupGuid`, `name`, `order`, `enabled`. Проверить публичный экспорт типов из `src/entities/settings/contact-tabs/index.ts`. Если `consts.ts` отсутствует или больше не нужен для новой модели, не создавать лишние константы.
- **Файлы для изменений:** `src/entities/settings/contact-tabs/model/types.ts`, возможно `src/entities/settings/contact-tabs/model/consts.ts`, `src/entities/settings/contact-tabs/index.ts`.
- **Ожидаемый результат:** В модели таба больше нет `contacts`, `conferences`, `groups`, `active`; новый тип пригоден для стора backend-групп. Проверка: точечный просмотр типов и экспортов, без реализации логики стора на этом шаге.

## Шаг 2: Переписать базовый стор `useContactTabs`
- **Описание:** Реализовать Pinia store как источник табов-групп: `tabs`, `activeTabId`, `loading`, `error`, `isInitialized`. Добавить getters `sortedTabs`, `enabledTabs`, `activeTab`, `hasTabs`. Добавить базовые actions `initTabs()`, `refreshTabs()`, `setActiveTab(tabId)`. В `initTabs()` получить группы через `useContactStore().fetchAllGroups(false)`, смапить их в табы и выбрать первый доступный таб.
- **Файлы для изменений:** `src/entities/settings/contact-tabs/model/use-contact-tabs.ts`, `src/entities/settings/contact-tabs/test/use-contact-tabs.test.ts`.
- **Ожидаемый результат:** Стор работает от backend-групп и не хранит контакты внутри табов. Проверка: unit-тесты стора покрывают маппинг групп, сортировку, enabled-tabs, выбор активного таба и пустой список групп.

## Шаг 3: Добавить защиту от повторной загрузки
- **Описание:** Доработать `initTabs()` так, чтобы при `isInitialized === true` он не ходил в backend без `force`. `refreshTabs()` должен всегда перечитывать backend. При обновлении сохранить активный таб, если его `groupGuid` остался в новом ответе; если пропал, выбрать первый доступный таб или сбросить `activeTabId` при пустом списке.
- **Файлы для изменений:** `src/entities/settings/contact-tabs/model/use-contact-tabs.ts`, `src/entities/settings/contact-tabs/test/use-contact-tabs.test.ts`.
- **Ожидаемый результат:** Повторные переходы по приложению не вызывают лишний `/api/Group/list`. Проверка: unit-тесты подтверждают один запрос при повторном `initTabs()`, принудительный запрос при `refreshTabs()` и корректное сохранение/сброс активного таба.

## Шаг 4: Инициализировать табы на уровне layout
- **Описание:** Вызвать `await useContactTabs().initTabs()` в `LayoutApplication.vue` после базовой инициализации приложения и до экранов, которым нужны табы. Встроить вызов в существующую последовательность `onBeforeMount`, не меняя несвязанную SIP/WebRTC/tooltip-логику.
- **Файлы для изменений:** `src/app/layout/LayoutApplication.vue`, при необходимости тест layout-компонента, если существующая тестовая структура это поддерживает.
- **Ожидаемый результат:** Данные табов становятся глобально доступны после старта приложения. Проверка: `initTabs()` вызывается из layout один раз, а повторные локальные инициализации защищены логикой шага 3.

## Шаг 5: Обновить отображение табов
- **Описание:** Перевести `TabsBlock.vue` на getters стора: брать `enabledTabs`, показывать порядковый номер таба, переключать активный таб через `setActiveTab(tab.id)`. В `TabItem.vue` определять активность через сравнение с `activeTabId` или переданный флаг, а не через `tab.active`. Сохранить текущую механику горизонтального скролла и cleanup `ResizeObserver`/listener.
- **Файлы для изменений:** `src/entities/settings/contact-tabs/ui/TabsBlock.vue`, `src/entities/settings/contact-tabs/ui/TabItem.vue`, при необходимости тест компонента.
- **Ожидаемый результат:** UI отображает backend-группы в порядке `order`, переключает активный таб через новый стор, горизонтальный скролл работает как раньше. Проверка: визуально/компонентным тестом подтверждено число табов, активный класс и вызов `setActiveTab(tab.id)`.

## Шаг 6: Подключить виджет панели к активной группе
- **Описание:** В `WorkspaceContactsWidget.vue` использовать `activeTab.groupGuid` как источник загрузки контактов активной группы. Контакты грузить отдельно в виджете или в composable уровня `widgets/workspace-widget`, не добавляя контакты в стор табов. При смене таба перечитывать контакты текущей группы, обрабатывать `loading`, пустой список и ошибку.
- **Файлы для изменений:** `src/widgets/workspace-widget/ui/WorkspaceContactsWidget.vue`, возможно новый composable в `src/widgets/workspace-widget/model/`, при необходимости тест виджета/composable.
- **Ожидаемый результат:** При переключении таба виджет получает `groupGuid` и отдельно загружает контакты этой группы. Проверка: запрос контактов содержит `groupId`, табовый стор не содержит контакты всех групп.

## Шаг 7: Убрать preferences и старую tab-editor логику из нового потока
- **Описание:** Не переносить `loadByPreferences()` и `saveByPreferences()` в новый стор. Убрать или адаптировать старые вызовы/тестовые моки, которые мешают сборке после перехода на backend-группы. Отдельно проверить `src/entities/preference/model/use-preference.ts`: текущий вызов `useContactTabs().loadByPreferences(...)` уже закомментирован, комментарий не удалять без необходимости.
- **Файлы для изменений:** `src/entities/settings/contact-tabs/model/use-contact-tabs.ts`, `src/entities/preference/model/use-preference.ts` только если потребуется, `src/pages/main/ui/settings-page/childrens/ContactTabsPage.vue`, `src/pages/main/ui/settings-page/childrens/ContactTabsPage.test.ts`, `src/widgets/tab-editor/**` только если старые импорты/вызовы ломают сборку.
- **Ожидаемый результат:** Новая логика табов не смешивает backend-группы с пользовательскими preferences. Проверка: в новом `useContactTabs` нет `loadByPreferences`, `saveByPreferences`, `setTab`, `deleteTab`, `changeOrder`, `updateContactsField`; сборка не падает из-за старых вызовов.

## Шаг 8: Проверка и финальная очистка task-контекста
- **Описание:** Запустить доступные проверки: минимум `npm run ts:check` и релевантные `vitest` тесты для contact-tabs/widgets; при возможности открыть приложение и вручную проверить один вызов `initTabs()`, соответствие табов backend-группам, переключение, отсутствие повторного `/api/Group/list`, поведение при пустом списке групп. В конце, согласно `AGENTS.md`, очистить блок `Кейс (основная задача)` в `AGENTS.md`, не затрагивая остальные правила.
- **Файлы для изменений:** тестовые файлы только при необходимости исправить проверки; `AGENTS.md` для очистки блока кейса на финальном шаге.
- **Ожидаемый результат:** Есть базовый глобальный стор табов от backend-групп, готовый для панели быстрого вызова; проверки пройдены или явно описаны причины, если часть ручных проверок невозможна в локальной среде.
