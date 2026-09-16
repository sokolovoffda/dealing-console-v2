# WUI-5557 — Пропадает часть истории вызовов

## Исходная задача

Часть совершённых звонков не отображается в истории пульта.
Env: 3.0.0-alpha.12 dealing-console. ОР — все звонки; ФР — часть пропадает.

## Уточнения пользователя

- Ветка: `bugfix/WUI-5557` от `develop`
- Сказали проверить параметры запроса и сравнить с web-client (`rtu-user-web-app`) — там якобы всё верно; подозрение на сервер/параметры.
- 2026-09-07: делать загрузку **как в web-client** — `requestChatHistory` по `<sip:calls@system>`.

## Решение (2026-09-07)

В `use-call-history-store.ts`:
- вместо `requestDialogs()` → `requestChatHistory({ pServed: '<sip:calls@system>', messagesLimit: 100 })` (API `@wui/im` 2.4.0: `lastEventId`, без `type`/`cursorEventId` web-alpha);
- убран фильтр «выбросить calls@system»;
- live `onCallMessage`: не игнорируем по `pServed === calls@system`; пропускаем только `from === calls@system` (как web); dedupe по `eventId`.
- Догрузка older: `fetchMore()` с `lastEventId`; `CallHistoryPanel` вызывает догрузку, если на текущей странице не хватает строк (`currentPage * perPage > filtered.length`) и журнал ещё не `isFullyLoaded`.

## HAR сравнение (2026-09-04)

Файлы:
- broken: `C:/Users/d.sokolov/Downloads/192.168.136.91.har` (стенд)
- ok: `C:/Users/d.sokolov/Downloads/localhost.har` (local develop)

Наблюдения по `/im` WebSocket:
- **Исходящие запросы одинаковые** по паттерну: login + 3× `requestDialogs` (одинаковые binary send frames, различается только user в login).
- Отдельного `requestChatHistory` на `<sip:calls@system>` **нет ни там, ни там**.
- Разные пользователи: стенд `9001@ROOT`, develop `1001@ROOT`.
- Ответ сервера: стенд `"MessageCount":18` (~18 call events в кадре), develop `"MessageCount":126` (~115+ call events).
- Вывод по этим двум HAR: разница не в параметрах клиента, а в **данных/юзере/бэкенде**. Для проверки гипотезы про `calls@system` нужен HAR web-client на том же `9001` на `192.168.136.91`.

## Связанные материалы

- https://jira.satel.org/browse/WUI-5557
- `C:\Users\d.sokolov\Desktop\projects\rtu-user-web-app\src\entities\calls\model.ts`
- `@wui/im`: `requestDialogs`, `requestChatHistory`
- HAR: `192.168.136.91.har`, `localhost.har`