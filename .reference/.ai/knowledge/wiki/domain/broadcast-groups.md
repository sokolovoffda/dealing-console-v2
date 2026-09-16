# Broadcast groups

## Назначение

Бродкаст-группы дают оператору массовое управление аудио пачкой завешенных линий (pinned slots): общий mic, общий уровень слышимости и индикация remote voice. UI один и тот же для monopoly-страницы и workspace widget.

## Текущее понимание

Слайс UI: `src/widgets/broadcast-groups-panel`.
Данные и runtime audio: `src/entities/pinned-calls` (`usePinnedCallsPanelStore`), без отдельного audio-runtime у групп.

Раскладка **4 или 8** групп:
- выбор через контекстное меню / `EmptySetupPrompt`;
- runtime draft до первой группы с members, затем REST `groupsLayout` (`PUT .../groups/layout`); localStorage **не** используется;
- Legacy: members есть, а `groupsLayout: null` → infer (max index ≥ 4 → 8, иначе 4) + heal PUT на fetch;
- Backend groups: index `0..7` (8 групп). Index 7 **включён**.
- Вне edit пустые ячейки остаются в сетке как невидимый пробел (позиции `index` не схлопываются); в edit пустые — `+`.
- Промпт «создать группы» — только если раскладка есть и ни у одной группы нет members.

Members группы — только pinned slots, ключ `pServed + slotIndex`. Один slot может входить в несколько групп; несколько слотов с одним `pServed` (A/A1/A2) независимы.

## Основные сущности

- `PinnedCallGroup` — `micState`, `volumeState`, `members[]`.
- `BroadcastGroupsPanel` / `BroadcastGroupCard` / `BroadcastGroupCardFooter` — UI карточки.
- `applyGroupAudioToMembers` — массовый override на member-слоты.
- `swapGroups(fromIndex, toIndex)` — обмен содержимым двух group index.

## Пользовательские сценарии

- Настроить раскладку 4/8 → видеть карточки групп.
- Если раскладка есть, а все группы пустые (вне edit) — `EmptySetupPrompt` «Нажмите, чтобы создать группы» → вход в edit.
- Edit: добавить/изменить/очистить members, удалить участника.
- Edit: **Переместить влево / вправо** — соседний index в порядке слева направо (`0..3` / `0..7`); пустой сосед = переезд, занятый = swap.
- Вне edit: mic / volume slider / mute управляют audio members; dial/call card с карточки группы нет.
- VAD: строка участника и дорожка в слайдере футера по `session.remoteVoiceDetected` / `remoteVoiceLevel`.

## Правила и ограничения

### Audio override

- Направление: `group action → pinned member slots → session audio`.
- UI группы показывает **intent группы** (`group.micState` / `volumeState` + runtime last volume), не reverse-sync от одного member.

### Sync при изменении состава группы (WUI-5615)

- После успешного `updateGroup` / `addGroupMember` store применяет текущий intent группы через `applyGroupAudioToMembers` с **явным** `micState` + `volumeState`/`volume` (пустой patch слоты не трогает).
- Scope: **все текущие members** группы (не только новые). Удалённый участник уже не в members → его runtime не меняем.
- Работает и при активной сессии у member, и без неё: runtime слота обновляется сразу; без session `applySlotAudioState` — no-op до появления звонка.
- Футер без активных сессий / в edit остаётся disabled для кликов — это не отменяет sync при смене состава.
- Побочный эффект (принят): если у уже состоящего в группе слота был локальный drift с карточки, при следующем изменении состава drift сбрасывается group override’ом.

### Sync после reload / при bind сессии (WUI-5615)

- После `fetchPanel` (normalize слотов сбрасывает mic в default) — `syncAllGroupsAudioToMembers` для всех групп с members.
- В `assignSessionToSlot` перед `applySlotAudioState` — `applyGroupsIntentToSlot`: mic = OR по группам слота; volume = max last-volume audible-групп (или INITIAL), иначе 0.
- Иначе dial→answer с pinned применял бы default слота, а не сохранённый intent группы.

### Карточка pinned ↔ группа (вариант A, WUI-5615)

- Правка mic/volume на карточке завешенной линии меняет **только этот слот**.
- Intent группы (`micState` / `volumeState` / last volume) **не** меняется; другие members **не** трогаются.
- Следующее действие футера группы (или sync при смене состава) снова накладывает group override на текущих members.

### Overlap одного slot в нескольких группах

- **Mic = OR** по всем группам слота.
- **Volume > 0 = last-action** текущей группы.
- **Volume = 0 / mute = max** last-volume по другим группам слота с `volumeState`; иначе 0.
- Target всегда по `pServed + slotIndex`.

### Перемещение групп (left/right)

- Порядок слотов UI = index раскладки слева направо.
- Меню только у группы с members; крайние слоты — disabled.
- Payload обмена: `micState`, `volumeState`, `members` (+ runtime `groupPlaybackVolumeByIndex`).
- API: `PUT /api/v1/me/pinned-calls/groups/reorder` body `{ fromIndex, toIndex }` (0..7).
  - Меняет местами **содержимое** двух групп; индексы ячеек на месте.
  - Ответ: полный `PinnedCallsPanelDto` (на фронте groups из ответа **не** применяем — бывает stale).
- UI: optimistic local swap → PUT; при ошибке откат snapshot groups + volume map.
- Raw: `.ai/knowledge/raw/jira/WUI-5293-groups-reorder-endpoint.md`.

### VAD

- Источник: локальный `AnalyserNode` в `useSessionFacade` (`useSessionSpeakerIndication`) → `remoteVoiceDetected` + `remoteVoiceLevel` (0..100).
- Строка: фон/иконка при VD; в edit VD приоритетнее trash; иконка пока `userM` (нет `userWaveM`).
- Футер: агрегат **OR**; серые полосы на free space scale при ≥1 active session; синяя дорожка = max `remoteVoiceLevel` говорящих.
- VD-трек: `:deep` `::before`/`::after` на `.wui-input-range__scale`, не absolute-wrapper снаружи.

### Footer visual matrix

Состояния `disabled | inactive | inactive-muted | active | active-muted` по наличию active session, mic и volume intent; токены `pinnedline-*`. Edit → визуал как disabled (клики недоступны).

## Edge cases

- Mute в одной группе не глушит slot, если он слышен в другой группе (max).
- Mic off в одной группе не глушит transmission, если другая группа держит mic on (OR).
- `volumeState` / mic группы на этом этапе — runtime (`upsertLocalGroup`), без обязательного REST sync.
- Legacy: groups с members при `groupsLayout: null` — UI infer layout + best-effort heal PUT на fetch.
- Stale `groups/reorder` response: UI держит optimistic groups; ошибка PUT → полный откат.

## Связанные страницы

- `../domain/pinned-calls.md`
- `../domain/speakers-ptt.md`
- `../frontend/components.md`
- `../product/open-questions.md`

## Источники

- `.ai/tasks/WUI-5293/case.md`
- `.ai/tasks/WUI-5293/implementation_plan_1.md`
- `.ai/tasks/WUI-5293/implementation_plan_2.md`
- `.ai/tasks/WUI-5293/implementation_plan_3.md`
- `.ai/tasks/WUI-5293/implementation_plan_4.md`
- `.ai/knowledge/raw/jira/WUI-5293-groups-reorder-endpoint.md`
- `src/widgets/broadcast-groups-panel/**`
- `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
- Уточнения пользователя по WUI-5293 от 2026-07-21/22/24
- `.ai/tasks/WUI-5615/case.md`
- Уточнения пользователя по WUI-5615 от 2026-09-08 (sync on membership change → все members; card↔group = A)

## Открытые вопросы

- Нужна ли отдельная публикация wiki в Confluence.
- Когда появится `userWaveM` в common-library — заменить временный `userM`.
