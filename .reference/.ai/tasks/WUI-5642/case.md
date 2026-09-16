# WUI-5642 — Не добавляются карточки абонентов на ПБВ

## Исходная задача

**Jira:** [WUI-5642](https://jira.satel.org/browse/WUI-5642)

На демо-стенде (РТУ `2.3.2-11s_Smolensk`, dealing-console `3.0.0-beta.1`) в режиме редактирования ПБВ выбранный абонент не появляется на сетке.

Причина: FE меняет состав группы через `PUT /api/user/groups/{guid}` + `contactGuids` ([RTU-12674](https://jira.satel.org/browse/RTU-12674)). На `11s` этого контракта нет/он не работает. Карточка после add зависит от RTU-membership: fast-dial alone не спасает, потому что layout-normalize отбрасывает guid вне RTU-группы.

## Уточнения пользователя

- 2026-09-11: известная проблема старого RTU; нужна новая версия бека, но для демо — временный FE-обход.
- Обход без смены беков: группа (shell/tabs) остаётся на RTU; membership+позиции — через уже существующий fast-dial; не требовать RTU `contactGuids` для отрисовки.
- Позже вернёмся к текущему способу (RTU membership SoT).
- Делается вместе с WUI-5640 (пробелы в имени группы → `_` на RTU).

## Ограничения

- Не менять RTU и новый backend.
- Минимальный reversible FE-патч.
- Не вводить IndexedDB/второй store состава — использовать fast-dial + резолв контактов по guid через существующий contacts API.

## Связанные материалы

- [WUI-5640](https://jira.satel.org/browse/WUI-5640) — пробел в имени группы
- [WUI-5641](https://jira.satel.org/browse/WUI-5641) — демо-стенд
- [RTU-12674](https://jira.satel.org/browse/RTU-12674) — `contactGuids` в groups API
- `.ai/knowledge/wiki/domain/quick-call-panel.md`
- `.ai/tasks/WUI-5642/implementation_plan_1.md`
