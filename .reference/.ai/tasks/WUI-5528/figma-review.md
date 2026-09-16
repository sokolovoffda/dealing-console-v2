# WUI-5528 — Figma review (2026-09-02)

**Источник:** selection в Figma MCP Bridge, файл `Макеты. Дилинговый пульт v3.0 (Copy)`, instance `mediaDevices`.

**Порядок работ:** UI по этому разбору → **API в конце** (`implementation_plan_2`).

---

## Структура страницы

Три `cblock`-секции под общим контентом Settings (shell из 5527):

### 1. «Медиа устройства» (Goose / global)

| Элемент | Значение в макете |
|---------|-------------------|
| Label | «Устройство для закрепленной линии» |
| Select | «Пользовательское устройство №1» |

**⚠ Ошибка дизайнера:** в макете **нет** selects «Режим работы» и «Область PTT».  
**Решение для UI:** рендерим **все три** select из текущего `GooseMediaSettingsPanel` (preferred goose + mode + conditional PTT scope).

### 2. «Медиа устройство №1» (пример: Goose)

| Группа | Поля |
|--------|------|
| Enabled | Switch «Устройство подключено» |
| Read-only | Тип «Гусиная шея», название, номер «Без номера», аудио-вход |
| Режим | Select «Режим работы» → «Режим с сохранением состояния» *(на карточке goose в макете; не путать с global Goose block)* |
| Meta | Status «Устройство готово», модуль «hub» |
| Activity | Indicator strip (VAD) + кнопки теста |
| Audio processing | Switches: эхоподавление, шумоподавление, AGC |

### 3. «Медиа устройство №2» (пример: Телефон)

Как №1, но:

- Тип «Телефон»
- Есть **аудио-выход** «Динамики» + **volume 60%**
- Нет select «Режим работы» (только у goose-карточки)
- Status «Устройство не готово»

---

## UI-kit / токены

- Секции: `settings-cblock-title` + content с `border-wrkspc-main-cblock-brd-def`, padding как Main Settings.
- Selects: `cmbBoxBig48` в Figma → `wui-select` / паттерн Main (height 48).
- Switches: `switch26` → WUI switch (как Main).
- Фон content area: `#212327` (`wrkspc` background).

---

## Delta vs текущий код

| Область | Макет | Код сейчас | Действие на UI-шаге |
|---------|-------|------------|---------------------|
| Page layout | cblock + wrkspc | `bg-black-*`, inner header | Шаг 1 |
| Goose block | 1 select (ошибка) | 3 selects | Шаг 2 — **3 selects** |
| Device card | enabled, volume, AEC×3, VAD | read-only AEC, no volume/enabled | Шаг 3 |
| Icon / mic sensitivity | Нет | Нет | Не делаем (v1) |

---

## Не из макета (отложено на API plan)

- REST goose / overrides
- Save-on-leave
- WS `MediaDevicesReported`
