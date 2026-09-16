# WUI-5549 — Не полностью заполняются страницы истории и справочника

## Исходная задача

На History и Directory при видимой верхней панели отображается меньше строк, чем в макете.

- ОР: 11 элементов (12 при скрытой верхней панели)
- ФР: отображается по 10
- Решение дизайна (Апряткин): выводить 11 элементов, высоту строк не менять
- Env: 3.0.0-alpha.12 dealing-console
- FixVersion: 3.0.0 (dealing-console)

## Уточнения пользователя

- Ветка: `bugfix/WUI-5549` от `develop`
- Фикс в отдельной ветке; после фикса — wiki → push
- Большой план не нужен (мелкий UI-баг)

## Ограничения

- Не менять высоту строк таблицы
- Выравнивать History с Directory: `11` / `12`
- У обеих таблиц обязательно `:auto-per-page-by-height="false"`, иначе `wui-data-table` перезапишет `perPage` авторасчётом (~10)

## Связанные материалы

- https://jira.satel.org/browse/WUI-5549
- `src/widgets/call-history/ui/CallHistoryPanel.vue`
- `src/widgets/phone-book/ui/PhoneBookPanel.vue`
