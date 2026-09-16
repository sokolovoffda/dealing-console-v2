# WUI-5615 — Синхронизация mic/volume при добавлении линии в группу завешенных

## Исходная задача

Jira: [WUI-5615](https://jira.satel.org/browse/WUI-5615)  
Тип: Feature Request · Статус: Анализ · Priority: Medium  
Компонент: Дилинговый пульт  
Связано: WUI-5293 (Broadcast groups, закрыт)

**Summary:** Синхронизировать состояние устройств ввода и вывода звука при добавлении завешенной линии в группу завешенных.

**Description (из Jira):**

На текущий момент при добавлении завешенной линии в группу завешенных, ввод и вывод звука линии и группы синхронизируются при первом изменении в группе.

1) Необходимо синхронизировать их в момент добавления в группу, как во время активного звонка, так и вне его.

2) Необходимо прописать взаимодействие настроек группы завешенных и завешенной линии, в случае, если настройки абонента, состоящего в группе, меняются на карточке.

Необходимо учитывать, что при отсутствии активных звонков в группе настройки группы блокируются.

## Уточнения пользователя

- Чат: работаем по WUI-5615 в ветке `feature/WUI-5615` (2026-09-08).
- **П.1:** качественно — sync внутри store после `updateGroup` / `addGroupMember` через `applyGroupAudioToMembers` с явным `micState` + `volumeState`/`volume`.
- **П.1 scope sync:** применять intent группы **ко всем текущим members** (не только к новым). Надёжнее; удалённый участник не в members → его runtime не трогаем. Побочный эффект: если у уже состоящего в группе слота был drift с карточки, при следующем изменении состава группы drift сбросится group override’ом — принято.
- **П.2 = вариант A:** правка mic/volume на карточке pinned меняет только этот слот; intent группы не меняется; другие members не трогаются; следующее действие футера группы снова накладывает override. Код по сути уже так; нужно явно прописать в wiki/case.
- **П.3 (2026-09-08):** абонент уже в группе, активных звонков нет, intent группы сохранён (store / после reload). Dial с панели завешенных → accept → сессия получает дефолт слота (mic off), не intent группы. Причина: `applySlotAudioState` берёт runtime слота; после normalize/reload mic слота всегда initial, sync состава не срабатывал. Нужен sync group→slots после `fetchPanel` и при bind сессии на слот.

## Ограничения

- Функционал поверх runtime audio `entities/pinned-calls` (`applyGroupAudioToMembers`, slot `micState`/`volume`).
- Overlap-правила WUI-5293 сохраняем: mic = OR по группам; volume mute = max по другим audible-группам; volume > 0 = last-action текущей группы.
- UI группы показывает **intent группы**, не зеркало одного member (wiki `broadcast-groups.md`).
- Без активных сессий у members футер группы disabled (клики недоступны) — это не отменяет sync runtime-состояния слотов при add.
- Не ломать PTT `activePinned` (WUI-3825): UI mic линии в этом режиме уже заблокирован.

## Связанные материалы

- Jira: https://jira.satel.org/browse/WUI-5615
- Parent/related: https://jira.satel.org/browse/WUI-5293
- Wiki: `.ai/knowledge/wiki/domain/broadcast-groups.md`
- Wiki: `.ai/knowledge/wiki/domain/pinned-calls.md`
- Код:
  - `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts` (`updateGroup`, `addGroupMember`, `applyGroupAudioToMembers`, `patchSlotRuntimeAudio`)
  - `src/widgets/broadcast-groups-panel/model/use-broadcast-groups-panel-actions.ts` (add/edit members → `updateGroup` без audio apply)
  - `src/widgets/pinned-calls-panel/model/use-pinned-calls-panel-slot-actions.ts` (локальный mic/volume слота)
