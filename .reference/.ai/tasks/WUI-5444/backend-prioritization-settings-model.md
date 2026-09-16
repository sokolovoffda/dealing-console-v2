# Prioritization Settings — модель для backend (WUI-5444 / WUI-5530)

Статус: **согласовано с фронтом 2026-08-26** (раздел Prioritization).  
Назначение: группы приоритета + точечная кастомизация контактов (замена IM prefs `customize`).

**Access:** раздел целиком `access: admin`. Общее правило: `settings-access.md`.

---

## Ключевые решения

| Тема | Решение |
|------|---------|
| Модель | Группы как в диспетчере + отдельный список contact-overrides |
| Persist | Новый API (не IM prefs) |
| Привязка | Per user (логин) |
| Глобальное открытие карточки | Остаётся в **Main** → `openCallCardOnHandsetPickup` |
| Override открытия здесь | Только **форсировать открытие** (`forceOpenCallCard: true`) на группе / контакте |
| Precedence | **группа > контакт > Main (global)** |
| Цвет / рингтон | И на группе, и на контакте; группа перетирает контакт |
| Контакт в группах | **Максимум в одной** группе |
| Индикация по статусам (полная матрица, CSV) | **Пока open** — не в этом DTO |
| Appearance сейчас | Базовые поля из конструктора диспетчера (цвет + простые параметры), без матрицы статусов |
| Defaults | Можно пустые `groups: []`, `contactOverrides: []` |
| API shape | На усмотрение бэка; **предпочтительно отдельный CRUD групп** (+ отдельные contact-overrides) |

---

## Связь с Main

```text
Эффективно открывать карточку при снятии трубки для контакта C:

1. C состоит в группе G и G.forceOpenCallCard === true  → true
2. иначе contactOverride(C).forceOpenCallCard === true     → true
3. иначе Main.openCallCardOnHandsetPickup                   → как в Main
```

То же precedence для **цвета** и **рингтона** (если на уровне задано; иначе fallback ниже / default UI).

`forceOpenCallCard: false` или отсутствие поля = «не форсируем» (не отдельный режим off), дальше смотрим следующий уровень.

---

## UI (целевой)

### Группы приоритета
- вкл / выкл
- приоритет (число, как в диспетчере — не путать с `order` ради order)
- имя, описание
- абоненты (`pServed[]`)
- базовый внешний вид (цвет + простые параметры)
- рингтон группы
- форсировать открытие карточки
- добавить / удалить группу

### Отдельные контакты (бывший customize)
- список важных абонентов **вне** (или независимо от) групп
- цвет, рингтон, forceOpenCallCard
- пример: 5 точечных контактов + 5 групп с другими людьми

Инвариант: один `pServed` не должен входить в две группы сразу.  
Тот же `pServed` может иметь contact-override и состоять в группе → при apply побеждает группа.

---

## DTO (логический контракт)

Имена path — ориентир; бэкенд может сделать CRUD.

```ts
/** Базовый вид карточки без матрицы статусов (индикация — later) */
type PriorityAppearanceBasics = {
  /** Hex, напр. "#1F6FEB"; null — не задан */
  color: string | null
  /** Упрощённо из конструктора диспетчера */
  blinking: boolean
  frequency: 'slow' | 'middle' | 'fast'
}

type PriorityGroupDto = {
  id: string
  enabled: boolean
  /** Чем меньше число — выше приоритет группы (как логика приоритетов в диспетчере; точную семантику sort подтвердить с бэком) */
  priority: number
  name: string
  description: string
  users: string[] // pServed[]
  appearance: PriorityAppearanceBasics
  /** null / "" — рингтон по умолчанию клиента */
  ringtoneGuid: string | null
  /** true = форсировать открытие карточки (перекрывает Main, если контакт в группе) */
  forceOpenCallCard: boolean
}

type PriorityContactOverrideDto = {
  pServed: string
  appearance: PriorityAppearanceBasics
  ringtoneGuid: string | null
  forceOpenCallCard: boolean
}

/** Снимок раздела (если бэк отдаёт целиком) */
type PrioritizationSettingsDto = {
  groups: PriorityGroupDto[]
  contactOverrides: PriorityContactOverrideDto[]
  revision?: number
  updatedAt?: string
}
```

Все поля раздела: `access: admin`.

---

## Предлагаемые endpoints (бэк может изменить)

```text
GET    /api/v1/me/settings/prioritization
PUT    /api/v1/me/settings/prioritization          # опционально полный снимок

GET    /api/v1/me/settings/prioritization/groups
POST   /api/v1/me/settings/prioritization/groups
PUT    /api/v1/me/settings/prioritization/groups/{id}
DELETE /api/v1/me/settings/prioritization/groups/{id}

GET    /api/v1/me/settings/prioritization/contacts
PUT    /api/v1/me/settings/prioritization/contacts/{pServed}
DELETE /api/v1/me/settings/prioritization/contacts/{pServed}
```

Предпочтение: **отдельный CRUD**, не только один жирный PUT.

---

## Defaults

```json
{
  "groups": [],
  "contactOverrides": []
}
```

Пустой ответ от бэка ок. Обязательной default-группы нет.

---

## Правила

1. Контакт ∈ не более чем одной группы; нарушение → 400 на write или нормализация на бэке (отклонить предпочтительнее).
2. Precedence apply на клиенте: group → contactOverride → Main/default UI.
3. `forceOpenCallCard` только форсирует `true`; не моделируем отдельный force-off.
4. Рингтон: только guid; файлы — `/prompt` (как в Main).
5. Полная индикация по статусам / CSV — **не здесь**, отдельный open-вопрос.
6. Миграция со старого prefs `customize` (`color`, `ringtoneGuid`) → `contactOverrides` на клиенте (опционально).

---

## Маппинг со старого dealing

| Было (prefs `customize`) | Стало |
|--------------------------|--------|
| `pServed` + `color` + `ringtoneGuid` | `contactOverrides[]` |
| — | `groups[]` (новое, как диспетчер) |
| — | `forceOpenCallCard` (новое; global в Main) |

---

## Открытые вопросы

1. **Индикация** — отдельный раздел/ресурс или расширение `appearance` до матрицы статусов позже.
2. Семантика сортировки `priority` (asc = выше) — подтвердить с бэком / как в диспетчере runtime.
3. Палитра: свободный hex vs только preset id (как `PRIORITY_COLORS` в диспетчере).
4. Точный CRUD path — на усмотрение бэка.

После ответа по индикации можно вынести `backend-indication-settings-model.md` или расширить этот файл.
