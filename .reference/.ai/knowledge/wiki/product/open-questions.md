# Открытые вопросы


## WUI-5638 — Electron stand-config (часть 2)

- Какой точный APS endpoint для проверки **только пароля** админа при смене адреса стенда?
  - Источник: `.ai/tasks/WUI-5638/case.md`, часть 2 плана.
  - Связанные страницы: `../electron/stand-config.md`.
- Нужен ли IPC `standConfig:clear` вместо ручного удаления `config.json`?
  - Источник: wiki `electron/ipc.md` при ingest WUI-5638.
  - Связанные страницы: `../electron/ipc.md`.

## Внешние контакты / группы (решение принято, детали реализации)

- Фильтр ПБВ по `name !== 'externalContact'` достаточен или нужен отдельный `type`/флаг группы на бэке?
  - Источник: уточнение пользователя от 2026-09-07.
  - Связанные страницы: `../domain/directory.md`, `../domain/quick-call-panel.md`.
- Как мигрировать уже лежащие в IndexedDB внешние контакты на бэк при обновлении клиента?
  - Источник: уточнение пользователя от 2026-09-07.

## WUI-5528 — Media Devices runtime (plan4 done 2026-09-15)

Продуктово и в коде (plan4): soft-disable `enabled`; lockdown без drop; футер OFF+activity→карточка / accept→toast; ПБВ clickable + toast; AEC только без сессий на устройстве; overrides → `LogicalMediaDevice`.

Осталось как **follow-up** (не блокер plan4):

- Нужен ли отдельный **диалог переноса** вызова с трубки при OFF, или в v1 достаточно блок+toast (сейчас default = блок+toast)?
  - Источник: уточнение пользователя от 2026-09-15.
  - Связанные страницы: `../domain/handsets.md`, `../domain/devices.md`.

## WUI-4733 — панель быстрого вызова

- Какой backend-контракт будет у будущего priority контакта или пользователя внутри группы.
  - Источник: WUI-4733, уточнение пользователя от 2026-06-01.
  - Связанные страницы: `../domain/quick-call-panel.md`.
- Нужен ли workspace-scoped cleanup SIP-подписок панели быстрого вызова при активном переключении большого количества групп.
  - Источник: `src/widgets/workspace-widget/model/use-workspace-contact-status-subscription/use-workspace-contact-status-subscription.ts`.
  - Связанные страницы: `../backend-integration/sip-webrtc.md`.
