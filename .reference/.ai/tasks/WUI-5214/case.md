# WUI-5214 — История вызовов 3.0 по аналогии со справочником

## Исходная задача

Нужно реализовать новую историю вызовов по аналогии со страницей справочника `src/widgets/phone-book/ui/PhoneBookPanel.vue`.

Новая история должна использовать тот же табличный подход, что и справочник: `widget-header`, поиск, `wui-data-table`, сортировка, пагинация и количество строк на странице по той же логике, что в справочнике.

В проекте уже существует старая реализация истории:

- `src/pages/main/ui/workspace/workspace-widgets/WorkspaceHistoryWidget.vue`
- `src/widgets/call-history/ui/CallHistoryTable.vue`
- `src/entities/call-history/ui/CallHistoryRow.vue`

Также уже есть компактная история в карточке вызова `src/features/call-card/ui/CallCardHistoryPanel.vue`, откуда можно взять поведение и иконки направлений вызова. Сама карточка истории в `call-card` не входит в объем этого кейса и должна остаться без изменений.

## Уточнения пользователя

- Номер задачи: `WUI-5214`.
- Работа ведется в актуальной ветке.
- На первом этапе нужно подготовить только `case.md` и план; реализацию начинать после отдельного согласования.
- Макет: `https://www.figma.com/design/JTPlAtfAfY1mawkWPsejsY/%D0%94%D0%B8%D0%BB%D0%B8%D0%BD%D0%B3%D0%BE%D0%B2%D1%8B%D0%B9-%D0%BF%D1%83%D0%BB%D1%8C%D1%82-v3.0?node-id=518-27054&t=3qEFKqPOs9OsQRod-4`
- Колонки новой таблицы: `тип`, `номер`, `полное имя`, `дата и время`, `длительность`, `запись`, `стрелка`.
- Колонка `стрелка` пока остается пустой, как в справочнике.
- Логику истории нужно брать из старой реализации `src/widgets/call-history/ui/CallHistoryTable.vue` и связанных компонентов.
- Для конференций нужно использовать иконку `userGroupM`.
- Нужны кнопки-фильтры через `my-btn`: `все`, `входящие`, `исходящие`, `пропущенные`, `частые`.
- Фильтры работают как toggle-кнопки с одним активным состоянием одновременно.
- Для `частые` нужно по возможности подключить реальную сортировку/фильтрацию; если логика быстро не находится, на первом этапе допустима только кнопка без полноценного backend- или store-контракта.
- Поиск должен работать так же, как в справочнике.
- Сортировка должна быть как в справочнике; пользователь ожидает сортировку по `номер`, `имя`, `время`, `длительность`.
- Пагинация должна работать по аналогии со справочником.
- Количество строк на странице должно использовать ту же логику, что и в справочнике.
- Клик по строке должен работать как в справочнике: открывать `call card` и `dialpad` с номером, а не как старая история.
- Нужно заменить текущий виджет истории новым виджетом в `src/widgets`.
- `src/pages/main/ui/HistoryPage.vue` можно убрать.
- `src/pages/main/ui/workspace/workspace-widgets/WorkspaceHistoryWidget.vue` нужно учитывать как существующую точку входа, но в целевом состоянии legacy-реализация должна быть удалена.
- `src/widgets/call-history/ui/CallHistoryTable.vue` можно заменить новым `CallHistoryPanel`.
- Legacy-компоненты истории после миграции нужно удалить.
- Автотесты не делать в ходе основных шагов; тесты должны идти финальным отдельным шагом.

## Ограничения

- Следовать FSD-структуре и использовать public API.
- Изменения должны быть точечными, без побочного рефакторинга соседних модулей.
- Нельзя менять `src/features/call-card/ui/CallCardHistoryPanel.vue` в рамках этого кейса.
- Для интерактивных кнопок фильтров использовать `my-btn`, а не нативные кнопки.
- Для таблицы использовать поведение `wui-data-table`, как в `PhoneBookPanel`, включая явное отключение `auto-per-page-by-height`, если понадобится фиксированный `perPage`.
- Поведение строки истории должно быть приведено к контракту справочника, а не legacy-виджета истории.
- Удаление legacy-компонентов выполнять только после подключения нового виджета и маршрутов/реестров к нему.
- Тесты планировать завершающим шагом после стабилизации UI и контрактов.

## Связанные материалы

- `src/widgets/phone-book/ui/PhoneBookPanel.vue`
- `src/features/call-card/ui/CallCardHistoryPanel.vue`
- `src/features/call-card/model/call-card-history.ts`
- `src/features/app-audio-controls/ui/GlobalAppVolumeControl.vue`
- `src/pages/main/ui/workspace/workspace-widgets/WorkspaceHistoryWidget.vue`
- `src/widgets/call-history/ui/CallHistoryTable.vue`
- `src/entities/call-history/ui/CallHistoryRow.vue`
- `src/entities/call-history/model/use-call-history-store.ts`
- `src/pages/main/ui/HistoryPage.vue`
- `src/pages/main/model/workspace-widget-registry.ts`
- `.ai/knowledge/wiki/frontend/components.md`
- `.ai/knowledge/wiki/frontend/routing.md`
- `.ai/knowledge/wiki/domain/calls.md`
- Макет Figma по ссылке из уточнений пользователя
