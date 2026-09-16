# Кейс: WUI-4443 — тестовое подключение Console к Turret APS WebSocket

## Описание текущей части кейса

Первая часть должна добавить в `dealing-console-ui` базовое подключение к Turret APS WebSocket `/ws/turret`: соединение с момента старта приложения, `SessionHello`, `SessionUpgrade` после login, heartbeat, reconnect и отправку стадий подключения до `READY`.

Выполнение Admin -> Console команд из очереди, debug snapshot и аудит всех команд к аппаратуре остаются следующими частями, потому что backend MVP пока не реализует dispatch команд на Console.

## Контекст предыдущих частей

- Предыдущих частей нет.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/backend-integration/api-routing.md`
- `.ai/knowledge/wiki/frontend/architecture.md`
- `.ai/knowledge/wiki/backend-integration/controller-ws.md`

## Связанные backend-источники

- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/schemas/turret.ts`
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/types/turret.ts`
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/routes/ws/turret.ts`
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/utils/turret-ws.ts`
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/utils/turret-connection-registry.ts`
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/docs/turret-aps.md`
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/docs/dealing-console-ui-turret-ws-tasks.md`

# План реализации: Turret APS WS lifecycle и стадии

## Шаг 1: Env и базовый WS-клиент

- **Описание:** Сверить контракт с backend-источниками в `C:/Users/d.sokolov/Desktop/projects/dealing-admin`, использовать существующий `VITE_ADDITIONAL_API_URL` как base URL для Turret APS и добавить helper для сборки WS URL additional backend. Создать FSD-модуль `src/shared/turret-admin-ws` с public API, типами envelope/messages и composable `useTurretAdminWs()` для `connect`, `close`, `send`, обработки входящих `SessionAck`, `SessionUpgradeAck`, `SessionUpgradeRejected`, `SessionError`, `Pong`.
- **Файлы для изменений:** `vite.config.ts`, `src/shared/url-helper/index.ts`, `src/shared/turret-admin-ws/index.ts`, `src/shared/turret-admin-ws/useTurretAdminWs.ts`, `src/shared/turret-admin-ws/types.ts`.
- **Ожидаемый результат:** Код умеет собрать WS URL additional backend из existing env/proxy и открыть WS `/ws/turret`, отправить `SessionHello`, принять базовые ответы сервера.
- **Проверка:** Точечная ручная проверка в dev: в Admin виден WS connect/`SessionHello`; `npm run lint` или более узкая доступная проверка по изменённым файлам.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: Lifecycle приложения, upgrade и heartbeat

- **Описание:** Подключить `useTurretAdminWs()` в `src/app/App.vue`, чтобы WS стартовал до авторизации и на странице логина. После `login`/`restore` отправлять `SessionUpgrade` с текущим MOA token. На `logout` очищать пользовательский контекст без обязательного закрытия WS. Добавить heartbeat `SessionHeartbeat` каждые 30 секунд и reconnect с exponential backoff при обрыве.
- **Файлы для изменений:** `src/app/App.vue`, `src/shared/turret-admin-ws/useTurretAdminWs.ts`, возможно `src/shared/turret-admin-ws/types.ts`.
- **Ожидаемый результат:** При открытии приложения Admin видит unauthenticated WS-сессию, после login сессия становится authenticated, heartbeat поддерживает сессию живой.
- **Проверка:** Ручная проверка через `http://webclientrtudev.satel.org:9996/admin/turret` или API сессий; проверить login/logout и отсутствие повторных параллельных WS-соединений.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: FSM стадий Console

- **Описание:** Реализовать отправку `SessionStageChanged` по стадиям `CONNECTED_UNAUTH`, `AUTHENTICATED`, `CONTROLLER_ONLINE`, `READY`. Для `AUTHENTICATED` использовать данные текущего пользователя/MOA-сессии. Для `CONTROLLER_ONLINE` и `READY` связаться с существующим `src/shared/controller`: использовать событие успешной регистрации контроллера и доступные поля hardware MAC/serial, не меняя wire-протокол sods-backend.
- **Файлы для изменений:** `src/shared/turret-admin-ws/useTurretAdminWs.ts`, `src/shared/turret-admin-ws/types.ts`, `src/app/App.vue`, при необходимости точечно файлы `src/shared/controller`.
- **Ожидаемый результат:** Admin видит актуальную стадию пульта и hardware identifiers, если они доступны из registration payload.
- **Проверка:** Ручная проверка с реальным sods-backend/controller: стадии последовательно доходят до `CONTROLLER_ONLINE`/`READY`; при отсутствии hardware identifiers стадия не затирает ранее известные значения пустыми полями.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: добавить/обновить страницу по Turret APS WS в `.ai/knowledge/wiki/backend-integration/` после стабилизации источников hardware identifiers.

## Шаг 4: Минимальные тесты и фиксация знаний

- **Описание:** Добавить минимальные unit-тесты на сериализацию WS-сообщений, lifecycle/FSM-переходы и reconnect/heartbeat timers там, где это возможно без реального WebSocket-сервера. Обновить project wiki по стабильному контракту Turret APS WS и ссылку в wiki index/log.
- **Файлы для изменений:** тестовые файлы рядом с `src/shared/turret-admin-ws`, `.ai/knowledge/wiki/backend-integration/turret-aps-ws.md`, `.ai/knowledge/wiki/index.md`, `.ai/knowledge/wiki/log.md`.
- **Ожидаемый результат:** Базовая логика сообщений и стадий покрыта тестами, долгоживущее знание о Turret APS WS зафиксировано в wiki.
- **Проверка:** Запустить точечные unit-тесты для нового модуля и доступную статическую проверку (`npm run lint` / `npm run test` по целевым файлам).
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: зафиксировать endpoint, env-настройку, lifecycle и источники данных.
