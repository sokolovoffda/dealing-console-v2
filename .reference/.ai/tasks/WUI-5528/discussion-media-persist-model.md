# WUI-5528 — Модель persist Media Devices (текст для обсуждения)

Дата: 2026-09-03  
Статус: согласовано на фронте (критические сценарии); **2 открытых вопроса** к бэку/продукту.

---

## Зачем это обсуждение

Нужно зафиксировать, как Settings «Медиа устройства» читают/пишут настройки, чтобы:

1. появился endpoint overrides (сейчас в OpenAPI нет);
2. scope goose и overrides был согласован;
3. не было двух источников правды (UI vs runtime vs бэк).

---

## Три слоя (не смешивать)

| Слой | Что это | API |
|------|---------|-----|
| **Локальная сборка** | Список карточек UI: controller modules + browser по `audiolabel` | Локально (`devices-store`) |
| **Goose settings** | preferred goose / mode / PTT scope | `GET/PUT /api/v1/me/goose-settings` |
| **Overrides** | enabled, volume, AEC на карточке | `GET/PATCH …/media-device-overrides/{hardwareSerial}` *(нет в OpenAPI — нужен)* |
| **Snapshot** | Инвентарь для бэка/админки | WS `MediaDevicesReported` → `GET …/turret-media-devices/{hardwareSerial}` |

**Список карточек в Console Settings = только локальная сборка.**  
Snapshot — side-channel, не источник списка для dealing UI.

Ключ устройства в overrides: **`logicalKey`** (`goose_L1`, `handset_L1`, `hub`, …), не browser `deviceId`, не uuid.

---

## Как работает merge

```text
UI card = localLogicalDevice + (overrides[logicalKey] ?? defaults)
```

- Нет записи overrides → defaults (`enabled: true`, `volume: 50`, AEC defaults).
- Есть запись, устройства локально нет → **orphan**: в store держим, карточку не рисуем, на leave **не удаляем**.
- Устройство появилось снова → merge подхватывает старые overrides.

---

## Save / ошибка бэка

Паттерн как у Main Settings:

1. UI пишет в dirty working copy; `synced` = последнее с сервера.
2. Уход из Settings → flush пула:
   - Main settings (уже есть);
   - goose `PUT` если dirty;
   - overrides `PATCH` если dirty.
3. Успех → mark synced.
4. Ошибка → **rollback** к synced + toast.

Не чистим бэк «потому что локально пусто».  
Auto-PATCH defaults для новых устройств — нет.

---

## Критические сценарии (согласовано)

### 1. Поменял настройки → ушёл → бэк ошибка

Rollback + toast. Runtime лучше откатывать вместе с UI (иначе рассинхрон до reload).

### 2. На бэке есть overrides, локально устройств 0

Empty-state. Overrides/goose в store не трогаем. Goose-блок: selects disabled. Leave без правок → запросов очистки нет.

### 3. Добавилось N новых устройств

Новые карточки с defaults. Старые overrides мержатся по `logicalKey`. Orphans без железа не показываем.

### 4. Сменился `hardwareSerial` / юзер сел за другой пульт

Path overrides = **serial текущего пульта**. Новый serial → новый bucket. Миграции старых overrides на новый serial в v1 **нет**.

### 5. Orphan `logicalKey`

Запись на бэке есть, железа нет → не UI-карточка, не delete. Preferred goose указывает на отсутствующий модуль → значение висит; runtime — отдельный fallback (первый ready goose).

### 6. Main (основной динамик) — громкость

В UI слайдер Main = тот же runtime, что footer (`globalVolumeMultiplier`).

Целевая идея применения:

```text
изменил volume → применили на пульте → (если persist) отправили на бэк
следующий сеанс → GET overrides → если Main есть и сматчили по logicalKey → накатили с бэка
```

Пульт = runtime «сейчас», бэк = durable между сеансами — **если** решим хранить Main volume на бэке (см. открытый вопрос).

---

## Открытые вопросы (нужен ответ)

### Q1. Сохраняем ли громкость Main (пульта) на бэк?

| Вариант | Смысл |
|---------|--------|
| **Да** | `logicalKey` hub/main в `media-device-overrides.volume`; footer + карточка = один runtime; при старте hydrate с бэка если Main есть |
| **Нет** | Main volume только локальный runtime / другой persist (если есть); в overrides volume для hub не пишем |

Рекомендация фронта для обсуждения: **Да** — иначе «на следующий день» громкость пульта не восстановится так же, как handset/goose.

### Q2. Scope goose: per user или per serial?

Сейчас в OpenAPI goose — **per user** (без serial). Overrides планируем **user + hardwareSerial**.

| Вариант | Goose | Overrides |
|---------|-------|-----------|
| **A** | per user | per user (без serial) |
| **B** | per serial | per serial *(рекомендация при «настройки привязаны к пульту»)* |
| **C** *(как сейчас черновик)* | per user | per serial — **смешанная модель** |

Нужна **единая** продуктовая модель: либо настройки «ездят с логином», либо «привязаны к железу пульта».

---

## Что просим у бэка (кратко)

1. `GET/PATCH /api/v1/me/media-device-overrides/{hardwareSerial}` (или эквивалент) с полями: `logicalKey`, `enabled`, `volume`, AEC toggles; orphans хранить; partial PATCH.
2. Ответ на **Q1** (Main volume в overrides?).
3. Ответ на **Q2** (единый scope goose + overrides).

Goose `GET/PUT /goose-settings` и snapshot `GET /turret-media-devices/{serial}` — уже ок по контракту; менять только если выберем scope B для goose.

---

## Связанные файлы

- `.ai/tasks/WUI-5528/case.md`
- `.ai/tasks/WUI-5528/media-devices-api-explained.md`
- `.ai/tasks/WUI-5528/api-contract.md`
- `.ai/knowledge/wiki/domain/devices.md`
- `.ai/knowledge/wiki/product/open-questions.md`
