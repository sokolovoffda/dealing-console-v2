# Кейс: WUI-5528 — Media Devices (runtime wire overrides)

## Описание текущей части кейса

После plan3 overrides **persist** работают, но почти не влияют на пульт: AEC/noise/AGC/`enabled`/volume (кроме Main) живут в overrides store, а сессии читают `LogicalMediaDevice` с захардкоженными дефолтами.

Нужно в той же ветке `feature/WUI-5528-p2`:

1. Прокинуть overrides в runtime-устройство.
2. Смену AEC-триады (и volume устройства, если оно идёт в media constraints) блокировать при активных сессиях на устройстве — toast «завершите сессии».
3. Включить soft-disable `enabled` (футер, goose/pinned, ПБВ, lockdown) по решениям в `case.md` (часть 3, 2026-09-15).

## Контекст предыдущих частей

- `implementation_plan_1.md` — UI Media Devices.
- `implementation_plan_2.md` — карточка Main + sync volume с footer.
- `implementation_plan_3.md` — REST goose + overrides, leave flush, Main debounce.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/devices.md`
- `.ai/knowledge/wiki/domain/handsets.md`
- `.ai/knowledge/wiki/domain/speakers-ptt.md`
- `.ai/knowledge/wiki/backend-integration/media-device-overrides-api.md`
- `.ai/knowledge/wiki/product/open-questions.md`

---

# План реализации: overrides → runtime + enabled + AEC guard

## Шаг 1: Merge overrides → `LogicalMediaDevice`

- **Описание:** При hydrate overrides и при `patchDevice` применять к соответствующему устройству в `devices-store`: `enabled` (новое поле или derived), `volume`, `echoCancellation`, `noiseSuppression`, `autoGainControl`. Main volume по-прежнему через `globalVolumeMultiplier` (не ломать). Rebuild logical devices не должен затирать смерженные user-поля без повторного apply из overrides.
- **Файлы:** `use-media-device-overrides-store.ts`, `devices-store` types/API apply helper, возможно тонкий `apply-override-to-device.ts` в `entities/media-devices-settings`
- **Ожидаемый результат:** ответ/звонок на goose/handset читает AEC с карточки Settings (без сессий на устройстве).
- **Проверка:** unit на merge/apply; ручной Network не обязателен.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет (или коротко в шаге wiki)

## Шаг 2: Guard смены AEC / volume при сессиях на устройстве

- **Описание:** Перед изменением AEC-триады (и per-device volume, если пишем в device для constraints) проверить сессии на `logicalKey` через `devices-sessions-store`. Если есть → не менять working/runtime; toast (i18n): нужно завершить сессии на устройстве. `enabled` в этом шаге не трогаем (отдельные правила в шагах 3–4).
- **Файлы:** `MediaDeviceItem.vue` и/или overrides store `patchDevice` guard; locales `ru-RU` / `en-GB` (+ zh при принятом паттерне проекта)
- **Ожидаемый результат:** при активном звонке на трубке/goose свитч AEC не переключается; без сессий — переключается и попадает в device.
- **Проверка:** unit guard; ручной сценарий с сессией.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Soft-disable `enabled` — ядро (ready/select + toast на медиа-действие)

- **Описание:** Учитывать `enabled` в выборе устройств для answer/bind/PTT/preferred goose / ready-списков (или отдельный `isUsable`). Попытка answer/bind/PTT на disabled → toast. Lockdown (нет ни одного usable): звонки не дропать; просмотр UI ок; медиа-действия → toast с CTA про Media Devices. Выключение goose при активных pinned на нём → запрет + toast. Выключение трубки с сессией без цели переноса → блок + toast (авто-перенос без спроса не делать).
- **Файлы:** overrides/`devices-store`/`devices-sessions-store` consumers (IncomingCallCard, handset handler, pinned slot actions, contact-card call — точечно), i18n
- **Ожидаемый результат:** disabled goose/handset нельзя использовать для медиа; активность в UI остаётся.
- **Проверка:** unit на фильтры/guards; ручной lockdown.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да — `devices.md` (кратко)

## Шаг 4: Footer трубки + авто-select единственной enabled

- **Описание:** Обе OFF → не пустой футер, disabled. OFF без активности → disabled no-op. OFF с активностью → статус-подсветка как сейчас; клик открывает карточку (просмотр); Answer / hardware off-hook → toast. Ровно одна enabled → она `selectedHandsetId`. Не ломать правило «всегда одна selected» визуально.
- **Файлы:** `FooterHandsetControls.vue` / call-card store handset selection; handsetEventHandler (ignore answer path)
- **Ожидаемый результат:** поведение как в `case.md` часть 3 §C трубки.
- **Проверка:** unit footer + ручной ringing на disabled.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да — `handsets.md`

## Шаг 5: ПБВ / activity visibility при lockdown (если дырки остались)

- **Описание:** Добить точки «взять вызов» / open→answer в ПБВ и родственных entrypoints тем же toast; убедиться, что индикация активности линии не гасится от `enabled=false`.
- **Файлы:** quick-call / contact-card call paths (по факту аудита после шага 3)
- **Ожидаемый результат:** активность видна; взять → toast.
- **Проверка:** ручной ПБВ + unit при наличии хука.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 6: Тесты + wiki cleanup

- **Описание:** AAA-тесты на merge, AEC guard, enabled filters, footer disabled+activity. Обновить `devices.md`, `handsets.md`, `media-device-overrides-api.md`; закрытые продуктовые решения — в `open-questions.md` убрать/перенести; `log.md` + `case.md` current state.
- **Файлы:** tests + `.ai/knowledge/wiki/**`
- **Ожидаемый результат:** контракт runtime зафиксирован в wiki.
- **Проверка:** точечный `npm run test`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да

---

## Вне скоупа этого плана

- Диалог «перенести вызов с трубки» (если не уложится в шаг 3 — follow-up; default = блок+toast).
- Hard LED-off на controller.
- `PreferencesReloadRequested`.
- Line key bindings.
- Re-acquire getUserMedia mid-call без завершения сессий (явно запрещено guard’ом).
