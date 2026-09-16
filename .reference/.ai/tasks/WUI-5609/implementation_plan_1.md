# Кейс: WUI-5609 — Странный поиск в справочнике

## Описание текущей части кейса

Перевести поиск справочника с голого `SearchText` (матчит в т.ч. guid) на точечные `Filters` + `FilterLogicOperator=or` по ФИО / телефону / email (`contains`). Один запрос — «идеальный» вариант; если `or` на стенде не заработает — отдельно обсудим multi-request merge.

## Контекст предыдущих частей

- Планов ещё не было.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/directory.md` (пока placeholder)
- `.ai/knowledge/wiki/backend-integration/api-routing.md` — contacts на основном RTU WebAPI
- Референс: `rtu-user-web-app` — `use-search-contacts-by-string-paginated.ts` / Filters `names` | `internalNumber` | `mobilePhone`
- Swagger: `src/__mocks_/swagger.json` — `GET /api/user/contacts`, `FilterOptionDto`, `FilterLogicOperator`

# План реализации: Filters OR для справочника

## Шаг 1: Типы + сборка query поиска контактов

- **Описание:** Расширить `PropertyName` фильтра значением `email` (если ещё нет). Добавить небольшой helper (рядом с contact utils / model), который из строки поиска собирает `GetContactsQuery`-фрагмент:
  - trim; пустая строка → без Filters / без SearchText;
  - иначе `FilterLogicOperator: 'or'` и четыре `Filters` с `contains`:
    - `names` + `string`
    - `internalNumber` + `phone`
    - `mobilePhone` + `phone`
    - `email` + `string`
  - **не** добавлять `SearchText`.
- **Файлы для изменений:** `src/entities/contact/types.ts`; новый helper + export через public API `entities/contact` (`index.ts` / `model/index` по существующему паттерну).
- **Ожидаемый результат:** из строки `"55"` получается корректный набор Filters+or; пустой ввод — пустой фрагмент.
- **Проверка:** `vue-tsc` / точечный unit на helper (по согласованию; можно отложить тесты на финальный шаг).
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: PhoneBookPanel — поиск через Filters

- **Описание:** В `PhoneBookPanel` вместо `SearchText: searchText` передавать результат helper в `store.fetchData` вместе с Page/Size/Sort. Без поиска — как сейчас, без Filters.
- **Файлы для изменений:** `src/widgets/phone-book/ui/PhoneBookPanel.vue`
- **Ожидаемый результат:** в Network уходит `FilterLogicOperator=or` + Filters по names/internalNumber/mobilePhone/email, без `SearchText`. Запрос `99` не отдаёт ложные guid-совпадения (если `or` на бэке ок).
- **Проверка:** ручная — справочник: `99` (пусто или только реальный contains); поиск по куску ФИО / email / номера.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: `domain/directory.md` — контракт поиска справочника (Filters OR, поля, без SearchText)

## Шаг 3 (только если or сломан на стенде): fallback multi-request

- **Описание:** Не делать сразу. Если после шага 2 `or` не работает — отдельный мини-план: N параллельных запросов + merge по `id`, пагинация total.
- **Файлы для изменений:** TBD
- **Ожидаемый результат:** TBD
- **Проверка:** TBD
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да
