# WUI-5200 — Верстка страницы справочника контактов

## Исходная задача

Задача направлена на доводку верстки страницы справочника контактов. Большая часть страницы уже была реализована ранее, в текущем кейсе требовалось завершить layout `PhoneBookPanel`, скорректировать поведение таблицы по высоте и добиться ожидаемого количества записей на странице в зависимости от состояния верхнего workspace header.

## Уточнения пользователя

- Номер задачи: `WUI-5200`.
- Работа ведется в нужной ветке, отдельный план по кейсу не создавался.
- Затронутый компонент: `src/widgets/phone-book/ui/PhoneBookPanel.vue`.
- Нужно было доделать именно верстку, без расширения предметной логики справочника.
- Для анализа пользователь дал локальный исходник библиотеки: `C:\Users\d.sokolov\Desktop\projects\common-library`.
- Локальная сборка `@wui/common-library` временно подключалась из `C:\Users\d.sokolov\Desktop\projects\common-library\wui-common-library-2.0.0-alpha.60.tgz`, пока в GitLab нет нужной собранной версии.
- Для страницы справочника требуется фиксированное количество строк в таблице:
  - `9`, когда верхний workspace header виден;
  - `10`, когда верхний workspace header скрыт.
- Автоподсчет `perPage` в `wui-data-table` для этого экрана не подходит и должен быть выключен явно.

## Ограничения

- План реализации не требовался, так как кейс уже находился на финальной стадии.
- Нужно было ограничиться точечными правками layout и параметров таблицы.
- Не менять несвязанные части страницы и не расширять бизнес-логику справочника.
- Не привязывать решение к еще не опубликованной GitLab-сборке библиотеки.

## Связанные материалы

- `src/widgets/phone-book/ui/PhoneBookPanel.vue`
- `src/app/layout/LayoutApplication.vue`
- `src/entities/workspace/model/use-workspace-store.ts`
- `C:/Users/d.sokolov/Desktop/projects/common-library/lib/components/data-table/wui-data-table.vue`
- `C:/Users/d.sokolov/Desktop/projects/common-library/lib/components/data-table/use-data-table-per-page.ts`
- `C:/Users/d.sokolov/Desktop/projects/common-library/wui-common-library-2.0.0-alpha.60.tgz`

## Итог кейса

- Таблица справочника вынесена в отдельную flex-зону внутри `PhoneBookPanel`.
- Для таблицы отключен `autoPerPageByHeight` через явный проп `:auto-per-page-by-height="false"`.
- Количество записей на странице переведено на фиксированный режим с учетом `isHeaderHidden` из workspace store.
- Зафиксировано знание по библиотечному поведению `wui-data-table` в project wiki.
