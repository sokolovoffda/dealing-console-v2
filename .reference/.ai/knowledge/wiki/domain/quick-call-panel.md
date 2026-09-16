# Панель быстрого вызова

## Fast-dial layout сетки ПБВ

Сетка ПБВ строится из двух источников:

- старый backend контактов и групп — source of truth по списку `user` групп и принадлежности контактов к группам;
- fast-dial backend `/api/v1/me/fast-dial` — source of truth по позициям карточек внутри сетки группы.

ПБВ отображает только группы с `type: 'user'`. `predefined` и `predefinedShared` группы больше не являются целевым режимом для ПБВ.

`contacts[].order` fast-dial трактуется как `cellIndex`, а не как плотный порядковый номер. Допустимы пустые ячейки между карточками. Лимит сетки — 36 ячеек, допустимые индексы `0..35`.

Если для backend-группы нет fast-dial group, UI показывает дефолтную раскладку контактов по порядку старого backend и не создает fast-dial запись при загрузке. Fast-dial group создается при первом пользовательском изменении раскладки: перемещении внутри группы, добавлении контакта в ячейку, переносе или дублировании контакта в группу.

Если fast-dial содержит `contactGuid`, которого нет в соответствующей backend-группе, карточка не показывается. Если в backend-группе есть контакт без fast-dial позиции, UI кладет его в первую свободную ячейку.

## Перемещение контактов между группами

В режиме редактирования карточка контакта открывает контекстное меню через кнопку с тремя точками. Если доступно несколько групп, в меню есть действия `Переместить в другую группу` и `Дублировать в другую группу`.

Сценарий переноса между группами:

- пользователь выбирает `Переместить в другую группу` на карточке исходной группы;
- карточка в исходной группе переходит в pending/movable state (`CONTACT_CARD_MOVABLE_TONE` = focused: bg `pres` + brd `foc`, **без opacity**);
- перенос внутри этой же исходной группы блокируется;
- клик по исходной карточке отменяет pending state;
- при переключении на другую группу edit mode остается включенным;
- клик по свободной ячейке целевой группы завершает перенос;
- после успешного backend-ответа контакт удаляется из исходной группы и появляется в целевой группе;
- fast-dial удаляет позицию контакта из исходной раскладки и сохраняет выбранный `cellIndex` в целевой раскладке.

Backend-последовательность для переноса между группами:

1. Старый backend `/api/user/groups` добавляет `contactGuid` в целевую группу и удаляет его из исходной группы.
2. Fast-dial backend обновляет layout исходной группы без контакта.
3. Fast-dial backend обновляет layout целевой группы с контактом в выбранной ячейке.
4. Обновляется кеш контактов исходной и целевой групп.

Дублирование в другую группу не меняет исходную группу: старый backend добавляет `contactGuid` только в целевую группу, а fast-dial обновляет только целевую раскладку.

Ошибки этого сценария на текущем этапе логируются в консоль без отдельного UI error state.

Endpoint `PUT /api/user/contacts/{guid}` не используется для переноса абонентов РТУ между группами: backend отвечает `The Contact must have type 'ExternalContact'`. Для переноса обычных контактов между группами актуальный контракт состава группы находится в `/api/user/groups`.

Для `PUT /api/user/groups/{guid}` поле `contactGuids` имеет replace-семантику: если массив передан, backend перезаписывает состав группы этим массивом; если массив пустой, группа очищается; если поле не передано, состав группы не должен меняться.

Перемещение внутри группы сохраняется только в fast-dial. Старый backend состава группы в этом сценарии не меняется. При клике по заполненной ячейке карточки меняются местами, и обе позиции сохраняются как `contacts[].order`.

## Добавление контакта в активную группу

В режиме редактирования пустая ячейка сетки показывает кнопку добавления. Клик по кнопке открывает существующую модалку выбора контакта `ChangeContactsModal`.

Сценарий добавления контакта:

- пользователь включает edit mode;
- пользователь нажимает плюс в свободной ячейке активной группы;
- открывается `ChangeContactsModal` в режиме выбора одного контакта;
- если пользователь закрывает модалку без выбора контакта, ничего не происходит;
- если выбранный контакт уже есть в активной группе, backend-запрос не выполняется и дубль не создается;
- если пользователь создает внешний контакт из модалки ПБВ, контакт создается на backend через `/api/v1/user/client/contact` сразу с `groupGuid` активной группы;
- после успешного создания внешнего контакта модалка добавляет его в текущую выдачу и выбранную модель, поэтому кнопка создания внешнего контакта исчезает, а созданный контакт сразу доступен для сохранения в ячейку;
- если выбранного контакта нет в активной группе, контакт добавляется в backend-состав группы;
- после успешного backend-ответа кеш активной группы обновляется;
- выбранная ячейка сохраняется в fast-dial layout активной группы.

Backend-последовательность для добавления контакта в активную группу:

1. `GET /api/user/groups/{groupGuid}` для получения текущих `name`, `type`, `contactGuids`.
2. Локальная проверка: если `contactGuid` уже есть в `contactGuids` или в текущем списке контактов активной группы, запрос на обновление не выполняется.
3. `PUT /api/user/groups/{groupGuid}` с теми же `name` и `type`, но с `contactGuids`, дополненным `contactGuid`.
4. Сохранение выбранного `cellIndex` в fast-dial layout активной группы.
5. Обновление кеша контактов активной группы.

Для нового внешнего контакта из `ChangeContactsModal` последовательность отличается:

1. `POST /api/v1/user/client/contact` с `groupGuid` активной группы, `name` равным номеру, `number` равным номеру и пустым `email`.
2. Модалка возвращает backend contact с настоящим `guid`; повторный `PUT /api/user/groups/{groupGuid}` не выполняется.
3. ПБВ добавляет contact в локальный кеш группы и сохраняет позицию в fast-dial.
4. После перезагрузки backend contact восстанавливается как внешний по `contactType: 'externalContact'`; `isExternal` не является самостоятельным backend-полем и вычисляется на frontend.

Пользователь может состоять в нескольких группах одновременно, но один и тот же контакт не должен дублироваться внутри одной группы. Добавление использует тот же контракт состава группы `/api/user/groups`, что и перенос между группами.

## Назначение

Панель быстрого вызова показывает контакты активной backend-группы и позволяет быстро перейти к контакту. В рамках WUI-4733 новая версия панели отделяет список вкладок-групп от загрузки контактов и SIP/BLF-статусов.

## Текущее понимание

Табы панели быстрого вызова являются backend-группами контактов с `type: 'user'`. Модель таба минимальная:

```ts
type ContactTab = {
  id: string
  groupGuid: string
  name: string
  order: number
  enabled: boolean
}
```

Стор `useContactTabs` хранит только группы, активный таб и состояние инициализации. Он не хранит контакты, конференции, линии или локальную настройку состава табов.

Контакты активной группы загружает виджет панели быстрого вызова через widget-level composable `useWorkspaceGroupContacts`. Контакты кешируются в памяти виджета по `groupGuid`, чтобы повторное открытие уже загруженной группы не делало новый запрос без `force`.

Раскладку карточек активной группы строит `useQuickCallFastDialGrid`: он совмещает контакты старого backend с fast-dial layout, отбрасывает позиции для отсутствующих в группе контактов и докладывает контакты без позиции в первые свободные ячейки.

Карточка контакта (`ContactCard` из `@/features/contact-card`) используется панелью быстрого вызова и переиспользуется Activity Monitor. Слои статуса и доступности звонка:

- `selfStatus` — наша локальная SIP-сессия с этим абонентом: входящий, исходящий, разговор, удержание;
- `hasCallAction` / `disabled` — можно ли инициировать/переключить звонок с этой карточки (устройство + номер/сессия).

Визуальный контракт карточки (`contact-card-tone.ts`) на theme-токенах:

- `CONTACT_CARD_BASE_TONE` — обычное состояние: `card-neutcon-bg/brd/avt/num/name-*-def`;
- `CONTACT_CARD_FOCUSED_TONE` / `CONTACT_CARD_MOVABLE_TONE` — focused и перенос: bg `card-neutcon-bg-base-pres`, brd `card-neutcon-brd-base-foc` (DS `state=focused` ≈ `state=movable`);
- `CONTACT_CARD_NEUTCON_INTERACTION_CLASSES` — hover / active(pressed) / focus-visible для neutcon base без self/disabled/movable;
- `CONTACT_CARD_DISABLED_TONE` — звонок недоступен: `card-neutcon-*-dis` **без бордера** (аналог бывшего offline-look, не через opacity);
- `CONTACT_CARD_INCOMING_SELF_TONES` — входящий `bg-card-state-bg-warncon-def`, high → `bg-card-state-bg-negcon-def` + текст `card-state-*-neg`;
- `CONTACT_CARD_SELF_TONES` — исходящий/hold → `waitcon`, активный → `callcon`; текст state по умолчанию `card-state-avt/num/name-def`.

Правила `hasCallAction`:

- контакт в завешенных **без** сессии → нужен ready goose + номер;
- контакт в завешенных **с** сессией → клик доступен всегда (accept / open / toast);
- обычный контакт **без** сессии → нужна доступная трубка + номер;
- обычный контакт **с** сессией → клик доступен (accept / open / toast без трубки);
- при `!hasCallAction` вне edit mode карточка рисуется disabled и клик no-op (без toast).

Клик по карточке при **входящем** (`RINGING` / `INITIAL`, не outgoing) — WUI-5596:

- завешенный → `session.answer` на ready goose + `openPinnedPanelSession`; без goose → toast `ScenarioContactViewCardDeviceCheckMessage` (карточка не «принимает» молча);
- обычный → `openSessionInPreferredHandset` + `answerSelectedSession`; без трубки → тот же toast;
- уже установленная сессия (не incoming) — прежнее поведение: open + при наличии goose `switchToCall` / open handset.

Если есть `selfStatus` и звонок доступен, фон перетирается self-тоном. Priority влияет на high/default только для `incoming-self`.

Пустая ячейка в edit mode: `my-btn` с `tone="alpha"` и границей `border-card-add-brd-base-def`.

## Основные сущности

- `useContactTabs` — глобальный Pinia store табов-групп.
- `ContactTab` — таб как backend-группа.
- `useFastDialStore` — Pinia store fast-dial panel/layout.
- `QuickCallPanel` — виджет, который выбирает активный `groupGuid` и загружает контакты группы.
- `useWorkspaceGroupContacts` — загрузка и кеш контактов активной группы.
- `useQuickCallFastDialGrid` — widget-level сборка 36-ячеечной сетки из контактов группы и fast-dial layout.
- `useQuickCallContactTransfer` — widget-level операции изменения состава группы: добавление контакта, удаление из группы, перенос и дублирование между группами через `contactGuids`.
- `ContactCard` (`@/features/contact-card`) — общая карточка контакта (ПБВ / Activity Monitor): presence / self / subscriber visual.
- `ChangeContactsModal` — существующая модалка выбора контакта, переиспользуется для добавления контакта в активную группу ПБВ.
- `useContactCardCall` — доступность звонка (`hasCallAction`) и действия клика (без требования presence online).
- `useContactCardStatus` — `presence` / `selfStatus` / `subscriberStatus` / device / pinned.
- `CONTACT_CARD_PRESENCE_TONES` — online/offline по priority.
- `CONTACT_CARD_BASE_TONE` / `CONTACT_CARD_DISABLED_TONE` — online default и offline/unavailable.
- `CONTACT_CARD_FOCUSED_TONE` / `CONTACT_CARD_MOVABLE_TONE` — focused и pending-перенос (без opacity).
- `CONTACT_CARD_SELF_TONES` — visual tokens self-статусов.
- `CONTACT_CARD_INCOMING_SELF_TONES` — visual tokens входящего self-вызова с high/non-high правилом.
- `CONTACT_CARD_SUBSCRIBER_ICONS` — доп. иконка BLF-линий абонента.

## Пользовательские сценарии

- При старте приложения layout инициализирует `useContactTabs().initTabs()`.
- Пользователь видит вкладки, соответствующие backend-группам с `type: 'user'`.
- При переключении вкладки меняется `activeTab`, а виджет грузит контакты этой группы по `groupGuid`.
- Если группа уже была загружена, виджет использует локальный кеш контактов группы.
- Карточки используют shared `ContactCard`: `presence` / `selfStatus` / `subscriberStatus`. Batch SIP/BLF subscribe делает Activity Monitor, не ПБВ — без чужих подписок presence обычно `offline`, self/звонок работают.
- В edit mode пользователь может добавить контакт в свободную ячейку активной группы через `ChangeContactsModal`; если контакт уже есть в активной группе, добавление не выполняется.
- В edit mode пользователь может перемещать контакт внутри активной группы; при клике по занятой ячейке карточки меняются местами, а новый layout сохраняется в fast-dial.
- В edit mode пользователь может перенести контакт между группами; backend-состав групп обновляется через `contactGuids`, а fast-dial обновляет layout исходной и целевой групп.
- В edit mode пользователь может дублировать контакт в другую группу; backend-состав меняется только у целевой группы, fast-dial обновляет только целевую раскладку.

## Правила и ограничения

- Backend-группы с `type: 'user'` являются source of truth для табов панели быстрого вызова.
- Fast-dial layout является source of truth для позиций карточек в сетке ПБВ.
- `useContactTabs` не должен загружать контакты всех групп на старте.
- `useContactTabs` не должен использовать preferences для состава табов.
- `initTabs()` не должен повторно ходить в backend, если стор уже инициализирован и не передан `force`.
- `refreshTabs()` перечитывает backend через forced init.
- При обновлении групп активный таб сохраняется, если его `groupGuid` остался в новом ответе; иначе выбирается первый доступный таб.
- Контакты активной группы грузятся отдельно от табов.
- Добавление контакта в активную группу и перенос контакта между группами изменяют backend-состав группы через `/api/user/groups` и поле `contactGuids`.
- `PUT /api/user/groups/{guid}` имеет replace-семантику для `contactGuids`; перед update нужно иметь актуальный список контактов группы.
- Один контакт может состоять в нескольких группах, но не должен дублироваться внутри одной группы.
- `ChangeContactsModal` переиспользуется как UI выбора контакта для добавления в ПБВ.
- При открытии `ChangeContactsModal` из ПБВ в нее передается `groupGuid` активной группы. Поэтому создание внешнего контакта из этой модалки идет через backend API, а не через IndexedDB.
- **Решение 2026-09-07:** IndexedDB для внешних уходит полностью. Системная группа `name: 'externalContact'`, `type: 'user'` — контейнер внешних; ПБВ не показывает вкладки с `name === 'externalContact'`. Реализация — отдельный тикет (не WUI-5609).
- Старое IndexedDB-поведение внешних контактов — legacy до миграции; после тикета fallback не оставлять.
- Внешний контакт определяется по backend `contactType === 'externalContact'`; fallback `!imLogin && !internalNumber` нужен только для старых DTO без `contactType`.
- Клик по карточке: при `hasCallAction` — звонок / accept входящего / open; иначе disabled и no-op.
- Входящий с карточки (WUI-5596): answer на goose (завешенные) или трубку; без устройства — toast.
- Unavailable новый звонок (нет goose для pinned / нет handset для обычного) использует `CONTACT_CARD_DISABLED_TONE` вне edit mode.
- `selfStatus` имеет визуальный приоритет над базой, но уступает `disabled`.
- Если есть `selfStatus` и звонок доступен, фон карточки выбирается по нашей сессии с абонентом.
- Priority влияет на high/default только для `incoming-self` (negcon vs warncon).
- Остальные self-статусы имеют фиксированные статусные цвета (`waitcon` / `callcon`).
- Future priority-цвета для базы должны добавляться расширением `CONTACT_CARD_PRIORITIES` / базовых тонов, без дублирования self-статусов.

## Edge cases

- Если backend вернул пустой список групп, `activeTabId` сбрасывается в `null`.
- Если backend вернул только не-user группы, ПБВ считает список вкладок пустым.
- Если групп нет, UI показывает `EmptySetupPrompt` «Нажмите, чтобы создать группу» (клик → модалка создания группы, как у `+`); кнопка `+` в tabs скрыта, пока нет ни одной группы.
- Если группа есть, а контактов нет (вне edit) — `EmptySetupPrompt` «Нажмите, чтобы создать контакты» → вход в edit.
  Источник: уточнение пользователя от 2026-07-16.
- Если у контакта нет `pServed`, он не попадает в список контактов группы, а в консоль пишется предупреждение.
- Если у контакта нет `internalNumber`, карточка считается `offline`, потому что SIP/BLF статус не может быть сопоставлен.
- Если SIP еще не зарегистрирован, Activity Monitor не батчит `subscribeSIP` до `onRegisteredSIP === true`. ПБВ batch-subscribe не выполняет.
- Локальная SIP-сессия текущего пользователя имеет приоритет над BLF-линиями при выборе визуала карточки.
- Если локальной сессии нет и абонент `online`, BLF-линии абонента отображаются как дополнительная `subscriberIcon`.
- Если звонкового состояния нет, карточка остается в `online` / `offline` по presence.
- Клик-звонок не требует `presence === online` (ПБВ остаётся «тихим» по BLF без регрессии звонка).

## Связанные страницы

- `statuses.md`
- `../backend-integration/sip-webrtc.md`
- `../backend-integration/im-preferences.md`
- `../frontend/stores.md`

## Источники

- `src/entities/settings/contact-tabs/model/types.ts`
- `src/entities/settings/contact-tabs/model/use-contact-tabs.ts`
- `src/entities/fast-dial/model/types.ts`
- `src/entities/fast-dial/model/normalizers.ts`
- `src/entities/fast-dial/model/use-fast-dial-store.ts`
- `src/entities/fast-dial/api/use-fast-dial-api.ts`
- `src/app/layout/LayoutApplication.vue`
- `src/widgets/quick-call-panel/ui/QuickCallPanel.vue`
- `src/widgets/quick-call-panel/model/use-quick-call-fast-dial-grid/use-quick-call-fast-dial-grid.ts`
- `src/widgets/quick-call-panel/model/use-workspace-group-contacts/use-workspace-group-contacts.ts`
- `src/widgets/quick-call-panel/model/use-workspace-contact-status-subscription/use-workspace-contact-status-subscription.ts`
- `src/features/contact-card/model/use-contact-card-status/use-contact-card-status.ts`
- `src/features/contact-card/model/contact-card-tone/contact-card-tone.ts`
- `src/features/contact-card/ui/ContactCard.vue`
- `src/features/contact-card/test/ContactCard.test.ts`
- Уточнение пользователя от 2026-08-26 (WUI-5446): карточка вынесена в `features/contact-card`
- `src/widgets/quick-call-panel/model/use-quick-call-contact-transfer/use-quick-call-contact-transfer.ts`
- `src/shared/ui/modals/change-contacts-keyboard/ChangeContactsModal.vue`
- `src/entities/contact/api/use-contact-api.ts`
- `src/entities/contact/utils.ts`
- `src/entities/contact/model/use-contact-store.ts`
- `src/entities/contact/model/use-contact-cached-store.ts`
- `src/entities/contact/test/use-contact-cached-store.test.ts`
- `src/features/contact-card/test/ContactCard.test.ts`
- Уточнение пользователя от 2026-06-01
- Уточнение пользователя от 2026-06-02
- Уточнение пользователя от 2026-06-04
- Уточнение пользователя от 2026-06-08
- Уточнение пользователя от 2026-06-16
- Уточнение пользователя от 2026-06-17

## Открытые вопросы

- Какой backend-контракт будет у будущего priority контакта или пользователя внутри группы.
- Нужен ли отдельный cleanup SIP-подписок Activity Monitor при уходе со страницы vs только `expires`.
