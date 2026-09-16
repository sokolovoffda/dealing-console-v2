# Кейс: WUI-5642 + WUI-5640 — временные FE-обходы ПБВ под старый RTU

## Описание текущей части кейса

Демо на РТУ `2.3.2-11s_Smolensk`: (1) нельзя добавить карточку на ПБВ из‑за отсутствия рабочего `contactGuids`; (2) имена групп с пробелом считаются одинаковыми. Временные FE-обходы без смены беков; после апгрейда RTU откатываем к текущей модели.

## Контекст предыдущих частей

- Предыдущих планов по этим тикетам нет.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/quick-call-panel.md`
- `.ai/knowledge/wiki/backend-integration/api-routing.md`
- `.ai/tasks/WUI-5640/case.md`
- `.ai/tasks/WUI-5642/case.md`

# План реализации: FE-обходы ПБВ (5640 + 5642)

## Шаг 1: WUI-5640 — пробелы в имени группы → `_` на RTU

- **Описание:** При создании user-группы для RTU заменять пробелы в `name` на `_`. При показе таба/имени в UI декодировать `_` обратно в пробел (чтобы пользователь видел «Группа 1»). Точка применения: encode перед `groupStore.createGroup` / внутри create; decode в `mapGroupToTab` (или рядом). Не трогать беки.
- **Файлы для изменений:**
  - `src/entities/group/` — маленький helper encode/decode + использование в `createGroup` (предпочтительно, один вход на RTU)
  - `src/entities/settings/contact-tabs/model/use-contact-tabs.ts` — decode при маппинге в tab name
  - при необходимости `QuickCallPanel.vue` / `addTabAndActivate`, если имя берётся мимо tabs mapper
- **Ожидаемый результат:** «Группа 1» и «Группа 2» создаются на старом RTU; в UI имена с пробелами.
- **Проверка:** ручная — создать две группы с пробелом; вторая не даёт 409; табы показывают пробелы.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет (временный обход)

## Шаг 2: WUI-5642 — membership через fast-dial без RTU `contactGuids`

- **Описание:** Временный dual-path для состава ПБВ-группы:
  1. Детект: `GET /api/user/groups/{guid}` без массива `contactGuids` **или** ошибка `PUT` с `contactGuids` → режим `membershipViaFastDial`.
  2. В этом режиме add / remove / move / duplicate **не** требуют успешного RTU `updateGroup(...contactGuids)`: достаточно локального кеша + fast-dial layout.
  3. Отрисовка: guid из fast-dial не дропать, даже если его нет в ответе `fetchContacts({ groupId })`.
  4. Reload: для orphan-guid из fast-dial дорезолвить контакт существующим contacts API (без смены бека; например поиск/фильтр по guid, уже известный костыль SearchText↔guid) и смержить в кеш группы.
  5. Когда `contactGuids` есть и PUT ок — оставить текущий путь без изменений.
- **Файлы для изменений:**
  - `src/widgets/quick-call-panel/model/use-quick-call-contact-transfer/use-quick-call-contact-transfer.ts`
  - `src/widgets/quick-call-panel/model/use-quick-call-grid-actions/use-quick-call-grid-actions.ts`
  - `src/widgets/quick-call-panel/model/use-quick-call-fast-dial-grid/use-quick-call-fast-dial-grid.ts` (и/или загрузка контактов)
  - `src/widgets/quick-call-panel/model/use-workspace-group-contacts/use-workspace-group-contacts.ts`
  - небольшой helper детекта/режима рядом с transfer или в `entities/group` (без новых абстракций сверх необходимости)
- **Ожидаемый результат:** на `11s` add контакта в ячейку сохраняется в fast-dial и карточка видна после reload; на новом RTU поведение как сейчас.
- **Проверка:** ручная на старом RTU — add/remove/move внутри демо-сценария; F5 сохраняет карточки; на нормальном RTU регрессии нет.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Кратко в `domain/quick-call-panel.md` пометка «временный обход демо RTU» + дата/тикеты — только если пользователь подтвердит wiki-апдейт; по умолчанию в этом шаге wiki не трогаем.

## Шаг 3 (опционально, по апруву): минимальные тесты на encode/decode и fail-soft add

- **Описание:** Только если стабилизируем контракт обхода и пользователь апрувит тесты. Unit на encode/decode имени; unit на «add без contactGuids → fast-dial path».
- **Файлы для изменений:** точечные `*.test.ts` рядом с helper/transfer.
- **Ожидаемый результат:** зелёные unit на обход.
- **Проверка:** `npx vitest run <files>`
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет
