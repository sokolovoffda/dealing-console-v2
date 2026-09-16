
# Directory / контакты (справочник)

## Назначение

Справочник пульта (`PhoneBookPanel`) — пагинированный список контактов с серверным поиском и сортировкой.

## Поиск (WUI-5609)

- Без `SearchText` (матчит в т.ч. guid).
- `FilterLogicOperator=or` в одном запросе на RTU WebAPI **не используем** — на практике не работает (как на web).
- Как web (`use-search-contacts-by-string-paginated`) + **email**:
  - только цифры → параллельно `internalNumber`, `mobilePhone`, `email` (`contains`);
  - иначе → параллельно `names` (ФИО), `email`;
  - merge по `id`, пагинация клиентская по смерженному списку.
- Сериализация Filters: `Filters[0].PropertyName=...` **без** `%5B`/`%5D` от `URLSearchParams`.

## Внешние контакты (решение 2026-09-07, отдельный тикет)

- IndexedDB для внешних **убираем полностью**; источник правды — бэк.
- Создание: проверить наличие группы с `name === 'externalContact'` (`type: 'user'`) → если нет, фронт создаёт её → `POST /api/v1/user/client/contact` с этим `groupGuid`.
- В ПБВ вкладки: показывать только группы с `name !== 'externalContact'`.
- Риск: фильтр по строке `name` хрупкий (переименование, коллизия имени). Желательно константа на фронте и единый фильтр во всех списках групп; в идеале позже — отдельный `type`/флаг на бэке.
# Directory (справочник)

## Назначение

Страница фиксирует устойчивые правила UI и пагинации справочника контактов (Directory / Phone Book) в пульте 3.0.

## Текущее понимание

Справочник — полноэкранная таблица контактов (`PhoneBookPanel`) с серверной пагинацией и сортировкой. Количество строк на странице зависит от видимости верхнего workspace header, а не от авторасчёта высоты таблицы.

## Правила и ограничения

- `perPage`: **11** при видимом header, **12** при скрытом (`isHeaderHidden`).
- Авторасчёт `autoPerPageByHeight` у таблицы отключён.
- Высоту строк таблицы не менять ради заполнения экрана (WUI-5549 / дизайн).
- Тот же размер страницы применяется в History (`CallHistoryPanel`).

## Связанные страницы

- `../frontend/components.md`
- `statuses.md`

## Источники

- `src/widgets/phone-book/ui/PhoneBookPanel.vue`

- `src/entities/contact/lib/build-contacts-directory-search-query.ts`
- `src/entities/contact/model/use-contact-store.ts` — `fetchDirectorySearch`
- `src/__mocks_/swagger.json` — `GET /api/user/contacts`
- Jira WUI-5609
- Уточнение пользователя от 2026-09-07 (как web + email)
- Уточнение пользователя от 2026-09-07 (внешние на бэк, группа `externalContact`)

## Открытые вопросы

- Покрывает ли Filter `email` / `mobilePhone` массивы `emails[]` / `mobilePhones[]` на всех версиях WebAPI.
- Нужен ли бэкенд-флаг/type для системной группы внешних вместо фильтра по `name === 'externalContact'`.
- Миграция уже сохранённых в IndexedDB внешних на бэк при обновлении клиента.
- `src/widgets/call-history/ui/CallHistoryPanel.vue`
- Jira WUI-5549
- Уточнение дизайна (Апряткин) в комментарии к WUI-5549: выводить 11 элементов, высоту строк не менять

## Открытые вопросы

- Нет.
