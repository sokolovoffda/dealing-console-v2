# IM Preferences

## Назначение

Страница фиксирует использование IM preferences и ограничения, которые важны для миграций UI-состояния.

## Текущее понимание

IM preferences используются для ряда пользовательских настроек: pinned calls, pinned call groups, bindings, ringtones, customize.

**Main settings (WUI-5527):** persist через REST `GET/PATCH /api/v1/me/main-settings`. Ключ `mainSettings` убран из preferences hub (`use-preference.ts`, 2026-08-31).

Для новой базовой логики табов панели быстрого вызова preferences не являются source of truth. Табы панели быстрого вызова строятся из backend-групп через `useContactTabs().initTabs()`.

В `use-preference.ts` ключ `tabs` остается в списке allowed keys и default preferences, но вызов загрузки табов из preferences закомментирован:

```ts
// useContactTabs().loadByPreferences(...)
```

Это зафиксированное решение WUI-4733: новая логика табов не должна переносить `loadByPreferences()` / `saveByPreferences()` в базовую версию.

## Правила и ограничения

- Не восстанавливать загрузку `useContactTabs` из preferences без отдельного продуктового решения.
- Preferences hub не загружает и не сохраняет main settings — source of truth REST Main API.
- Preferences-тесты не должны ожидать `loadByPreferences` для табов.
- Старый ключ `tabs` может существовать в preferences как legacy/default поле, но новая панель быстрого вызова его не использует для состава вкладок.

## Связанные страницы

- `../domain/quick-call-panel.md`
- `../frontend/stores.md`

## Источники

- `src/entities/preference/model/use-preference.ts`
- `src/entities/preference/model/use-preference.test.ts`
- `src/entities/settings/contact-tabs/model/use-contact-tabs.ts`
- Уточнение пользователя от 2026-06-01

## Открытые вопросы

- Нужно ли в будущем мигрировать или удалить legacy `tabs` из preferences после полного отказа от старой модели.
