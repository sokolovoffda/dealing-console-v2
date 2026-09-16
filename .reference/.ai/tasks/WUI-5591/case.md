# WUI-5591 — Окно выбора абонента выходит за пределы экрана

## Исходная задача

На странице broadcast групп при добавлении группы выпадающий список пользователей выходит за пределы экрана.

- ОР: список соответствует размеру поля
- ФР: список уезжает за экран
- Note: только пульт, на Web ок
- Env: 3.0.0-alpha.12 dealing-console

## Уточнения пользователя

- Ветка: `bugfix/WUI-5591` от `develop`
- Предположение: тот же класс проблемы, что WUI-5546 — CSS Anchor Positioning на старых/неподдерживающих браузерах

## Ограничения

- UI: `AddBroadcastGroupMembersModal` → `WuiCombobox` (common-library)
- Combobox list: `position-anchor` + `position-area: bottom center` (anchor CSS)

## Связанные материалы

- https://jira.satel.org/browse/WUI-5591
- https://jira.satel.org/browse/WUI-5546 (тот же класс: anchor)
- `src/widgets/broadcast-groups-panel/ui/AddBroadcastGroupMembersModal.vue`
- `common-library` `wui-combobox.css` (`.wui-combobox__list`)
