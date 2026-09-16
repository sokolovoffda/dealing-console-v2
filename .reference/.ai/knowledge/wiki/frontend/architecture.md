# Frontend Architecture

## FSD-импорты

Межслайсовые импорты должны идти через public API соответствующего слайса и alias, например `@/widgets/quick-call-panel` или `@/entities/contact`.

Внутри одного FSD-слайса разрешены прямые локальные импорты через `./...`, если импортируемый модуль является внутренней деталью этого же слайса. Не нужно импортировать private path того же слайса через alias, например `@/widgets/quick-call-panel/ui/...`: такой импорт запрещается линтом `no-restricted-imports`.

Пример: компонент `ContactCard.vue` в `features/contact-card` может импортировать внутренний model-файл как `../model/contact-card-tone`.

## Назначение

Страница фиксирует устойчивые правила frontend-архитектуры проекта.

## API-слой и backend-запросы

Backend-запросы должны размещаться в API-слое той сущности, к которой относится backend-контракт. Если для сущности уже есть API-модуль, новые методы нужно добавлять рядом с существующими методами этого модуля.

Для контактов таким местом является `src/entities/contact/api/use-contact-api.ts`. Этот модуль уже использует проектный паттерн:

- `axios`;
- `getAppURL`;
- типизированные DTO/query-типы из `src/entities/contact/types.ts`;
- auth-инфраструктуру axios, настроенную в приложении.

Widget-level код не должен напрямую собирать backend URL и выполнять запросы из Vue-компонентов. Виджеты должны вызывать методы model/composable-слоя, а model/composable-слой должен использовать entity API.

Пример для панели быстрого вызова:

- API-методы добавления/удаления принадлежности контакта к группе должны жить в contact API-слое, если не появится более точная сущность.
- `widgets/quick-call-panel/model` отвечает за сценарий ПБВ: проверка дублей, активная группа, вызов API, refresh контактов группы.
- UI-компоненты ПБВ только вызывают actions/composables модели.

Если в будущих задачах появляются API-методы для других сущностей, применять тот же принцип: сначала искать существующий entity API-слой этой сущности и расширять его; новый слой создавать только если подходящего места нет.

## Связанные страницы

- `stores.md`
- `../domain/quick-call-panel.md`

## Источники

- `src/entities/contact/api/use-contact-api.ts`
- `src/entities/contact/model/use-contact-filtering.ts`
- `src/widgets/binding-contact/ui/BindingContactModal.vue`
- `src/widgets/quick-call-panel/model/use-workspace-group-contacts/use-workspace-group-contacts.ts`
- Уточнение пользователя от 2026-06-03

## Открытые вопросы

- Нужен ли отдельный entity/API-слой для управления принадлежностью контактов к группам, если эта логика выйдет за пределы `entities/contact`.

