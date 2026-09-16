# WUI-4443 — подключение Console к Turret APS WebSocket

## Исходная задача

Нужно подключить `dealing-console-ui` к WebSocket нового backend/admin-сервиса Turret APS.

Пульт должен открывать WebSocket-соединение при старте приложения, включая страницу логина. Канал нужен для обмена командами и состояниями между Console, Dealing Admin и аппаратной частью пульта:

- Console сообщает Admin, что пульт открыт и находится online;
- после входа пользователя Console сообщает данные авторизованного абонента;
- Console сообщает стадии подключения к локальному контроллеру и готовности пульта;
- в будущих этапах Admin сможет отправлять команды на Console/пульт.

Документация backend описывает WebSocket endpoint `/ws/turret` и HTTP API мониторинга сессий/очереди команд.

Полный целевой кейс:

- при старте web-приложения всегда подключаться по WS к `dealing-admin`, сообщая адрес/серийник пульта;
- при авторизации передавать информацию об авторизованном абоненте;
- при выходе из учетной записи передавать факт выхода и оставлять WebSocket включенным;
- принимать входящие admin-команды для управления аппаратной частью: яркость, buzzer, лампочки, информация о media devices;
- принимать входящие admin-команды для управления software-частью: рабочие столы, виджеты, тест media devices, binding механических кнопок;
- принимать входящие admin-команды для сбора диагностических данных: логи, ping, traceroute, уровень логирования;
- отправлять исходящие сообщения со статусом регистрации;
- отправлять данные для мониторинга активности;
- отправлять информацию о занятости линий;
- пробрасывать команды с пульта.

## Уточнения пользователя

- Turret APS WebSocket использует тот же backend, что и additional API. Отдельный env для Turret не нужен; base URL берётся из `VITE_ADDITIONAL_API_URL`.
- Рабочее имя задачи было `WUI-WS`; актуальный номер задачи — `WUI-4443`.
- На текущем этапе нужно создать кейс и план, реализацию не начинать.
- Исходники backend доступны локально в `C:/Users/d.sokolov/Desktop/projects/dealing-admin`; при реализации можно брать оттуда актуальные схемы, типы и детали WS/API.
- Для первой реализации `hardwareSerial` нужно отправлять из `mcu_uuid` hub-модуля локального контроллера.

## Ограничения

- Не хардкодить dev URL в коде приложения.
- Не добавлять отдельный `VITE_TURRET_ADMIN_URL`, пока Turret APS живёт на additional backend.
- Не смешивать новый backend WebSocket с существующим `src/shared/controller`, потому что `controller` отвечает за локальный WebSocket аппаратного контроллера `ws://127.0.0.1:8765`.
- WebSocket должен стартовать выше авторизованного layout, так как он нужен уже на странице логина.
- Новые файлы должны соответствовать FSD и экспортироваться через `index.ts`.
- Dispatch команд Admin -> Console в backend MVP пока не реализован, поэтому выполнение очереди команд не входит в первую часть.

## Текущее покрытие реализации

Сделано в первой части:

- базовое WS-подключение к `/ws/turret` через additional backend;
- `SessionHello` при открытии приложения;
- `SessionUpgrade` после login/restore и обновления token;
- heartbeat и reconnect;
- стадии `AUTHENTICATED`, `CONTROLLER_ONLINE`, `READY`;
- `hardwareMac` из `sysinfo:netinfo.interfaces[].mac_address`;
- временный `hardwareSerial` из `sysinfo:modulesinfo` hub `mcu_uuid`;
- базовые unit-тесты WS lifecycle/FSM.

Не сделано и требует следующих планов:

- входящие admin-команды для аппаратного управления;
- входящие admin-команды для software-части;
- сбор диагностических данных по запросу Admin;
- мониторинг активности сверх текущих стадий/heartbeat;
- передача занятости линий;
- проброс команд с пульта и аудит/relay команд.

## Связанные материалы

- `C:/Users/d.sokolov/Desktop/projects/dealing-admin` — локальный репозиторий backend/admin.
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/schemas/turret.ts` — первичный источник Zod-схем Turret APS.
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/types/turret.ts` — backend-типы Turret APS.
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/routes/ws/turret.ts` — WS handler `/ws/turret`.
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/utils/turret-ws.ts` — разбор/сериализация WS-сообщений.
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/utils/turret-connection-registry.ts` — registry сессий и heartbeat timeout.
- `C:/Users/d.sokolov/Downloads/turret-aps.md` — описание реализованного Turret APS в `dealing-admin`.
- `C:/Users/d.sokolov/Downloads/dealing-console-ui-turret-ws-tasks.md` — список задач для `dealing-console-ui`.
- `src/app/App.vue` — глобальная точка старта приложения, монтируется и на login.
- `src/shared/controller/useController.ts` — существующий локальный WS к аппаратному контроллеру.
- `src/shared/url-helper/index.ts` — существующие правила сборки URL.
- `.ai/knowledge/wiki/backend-integration/api-routing.md` — правило хранить backend URL в env и строить URL через helper.

## Проверенные факты

- `http://webclientrtudev.satel.org:9996` доступен.
- `ws://webclientrtudev.satel.org:9996/ws/turret` открывает соединение.
- Сервер сразу присылает `SessionAck` со стадией `CONNECTED_UNAUTH`.
- `SessionHello` с `schemaVersion: "3.0.0"` отправляется без ошибки со стороны сервера.
- В локальном controller WS `register_answer` содержит только факт `accept_registration`; MAC приходит в `sysinfo:netinfo.interfaces[].mac_address`, а временный `hardwareSerial` берётся из `sysinfo:modulesinfo.modules[]` для hub-модуля из поля `mcu_uuid`.
