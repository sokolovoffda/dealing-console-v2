# Frontend Testing

## Назначение

Страница фиксирует устойчивые практики тестирования frontend-логики в проекте.

## Текущее понимание

Для WUI-4733 добавлены и обновлены focused-тесты:

- `useContactTabs` — backend-группы, active tab, guard от повторной загрузки, refresh.
- `useWorkspaceGroupContacts` — загрузка контактов группы, кеширование, forced refresh.
- `WorkspaceContactCard` — отображение номера и имени, выбор `online/offline`, применение default tone-классов.

Тесты карточки панели быстрого вызова размещаются в `src/widgets/workspace-widget/test/`, чтобы не смешивать production UI-файлы и тесты в одной папке.

## Правила и ограничения

- Использовать AAA Pattern: Arrange / Act / Assert.
- Для SIP/WebRTC transport не писать автотесты без отдельной необходимости; базовую UI-логику presence можно тестировать моками `useContactStatusState`.
- Если компонент тянет тяжелые barrel-импорты, допустимо мокать только нужный store/API, чтобы не поднимать SIP/WebRTC/устройства в focused-тесте.
- Тесты должны проверять актуальный UI-контракт. Если компонент больше не рендерит поле, тест не должен требовать это поле.
- Preferences-тесты должны учитывать, что табы панели быстрого вызова больше не грузятся из preferences.

## Связанные страницы

- `../domain/quick-call-panel.md`
- `../domain/statuses.md`
- `../backend-integration/im-preferences.md`

## Источники

- `.cursor/rules/testing.mdc`
- `src/widgets/workspace-widget/test/WorkspaceContactCard.test.ts`
- `src/widgets/workspace-widget/model/use-workspace-group-contacts/use-workspace-group-contacts.test.ts`
- `src/entities/settings/contact-tabs/test/use-contact-tabs.test.ts`
- `src/entities/preference/model/use-preference.test.ts`
- `src/entities/contact/ui/ContactCard.test.ts`

## Открытые вопросы

- Нужен ли отдельный общий testing helper для моков `useContactStatusState` и `WuiIcon`.
