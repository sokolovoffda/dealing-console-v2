# WUI-5444 — Сводка: Settings IQ/MAX TOUCH (IPC) vs наш пульт

Источник: `IQMAX TOUCH Turret User Guide` (Unigy 4.3), Chapter 11 Settings application.  
Сравнение с текущим Settings дилингового пульта (as-is).

## Структура Settings у IPC

Левая панель:

- **USER SETTINGS** (пользователь)
- **ADMIN SETTINGS** (только админ, отдельный Hardware Installation Manual)
- **Diagnostic Tool** (если включён админом)

Правая панель — контент выбранного пункта.  
Сохранение обычно **мгновенное**, без кнопки Save (кроме смены пароля).

---

## USER SETTINGS IPC — что есть

### 1. Account Info
- Username (read-only)
- Personal / Intercom extension (read-only)
- Change password (current / new / confirm)

### 2. Diversion (переадресация)
- **ICM diversion** (intercom): No Diversion / Immediate / Busy / RNA / BRNA + Divert To
- **DDI diversion** (line / call forwarding): Divert From + type + Divert To; Dual Divert (busy → A, RNA → B)
- Условия: Immediate, Busy, Ring/No Answer, Busy/Ring/No Answer, Dual Divert

### 3. Call Handling
- Auto-answer Intercom (ON/OFF)
- Popup notifications по типам: Intercom / High Priority / Low Priority
- Color coding приоритетов и состояний кнопок (+ Restore Defaults)
- Ringtones по типам: High Priority / Low Priority / Pending / Messages
- CLI display: Name / Number / Toggle / Match / Lookup (+ формат имени, company name, приоритет источников)

### 4. Date & Time
- Time format: 12h / 24h
- Date format: MM-DD-YY, MM-DD-YYYY, DD-MMM-YY, DD-MM-YYYY, YYYY-MM-DD

### 5. Device / Volume
- Display language
- Font magnification: Small / Medium / Large
- Brightness (+ отдельно Expansion Module)
- Sleep timer (5–30 min)
- Default receive volume: Handset, Hands-Free
- Ringer volume

### 6. System Info (read-only)
- Station network (host, domain, IP, DHCP, gateway, MAC)
- Servers / zone
- NTP
- VoIP parameters
- Software version / part / serial
- Deployment / licenses / desk location

### 7. Speakers
- Slide-to-latch enable/disable (для каналов)
- Speaker groups latch: Push to Talk / Push to Latch/Unlatch

---

## Что уже есть у нас (близкие аналоги)

| IPC | Наш пульт |
|-----|-----------|
| Diversion | Обработка входящего вызова (правила forwarding) |
| Language | Основные → Локализация |
| Ringtone + volume | Основные → Уведомления |
| Color / ringtone per contact | Приоритизация |
| Device / audio devices | Медиа устройства (+ Goose PTT) |
| Speakers latch / PTT | Goose mode + PTT scope; PTT toggles в Main |
| System / version | Версия в сайдбаре + network interfaces |
| Line favorites / bindings | Клавиши линий |
| Contact bookmarks | Вкладки контактов |

RTU-специфика, которой нет у IPC в Settings (оставить): обучение, автозапись конференций, upload рингтонов, reset settings, Goose-специфика, contact tabs.

---

## Рекомендации: что добавить в макеты Settings

Приоритет для дизайна / продукта (не всё обязательно в MVP).

### Must-have для паритета с IPC (пользовательский опыт)

1. **Account / Профиль**
   - Логин, внутренний номер (read-only)
   - Смена пароля (если auth это позволяет)

2. **Call Handling / Поведение вызовов** (новый раздел или расширение «Основных»)
   - Popup-уведомления о входящих (on/off; желательно по типам/приоритету)
   - CLI / отображение caller ID: имя / номер / чередование
   - Рингтоны не только «один на всё», а **по приоритету / типу** (если продукт это поддержит)

3. **Date & Time**
   - Формат времени 12/24
   - Формат даты

4. **Device / Volume (UI + громкости)**
   - Размер шрифта (S/M/L)
   - Громкость трубки / hands-free / рингтона по умолчанию  
   - Brightness / sleep — только если desktop/Electron и есть реальный control

5. **System Info (диагностика для оператора)**
   - Сеть (IP, gateway, MAC)
   - Backend / SIP endpoint
   - Версии frontend / Electron / controller  
   (часть уже есть по клику на version — оформить как полноценный раздел)

### Should-have (усиление текущего)

6. **Diversion UX как у IPC**
   - Явные типы условий и Dual Divert (busy ≠ no-answer destinations)
   - Более понятные ICM vs line diversion, если домен RTU это разделяет

7. **Color coding глобально**
   - Цвета приоритетов/состояний линий (не только per-contact в Приоритизации) + Restore defaults

8. **Speakers / PTT settings в одном месте**
   - Свести Goose latch/PTT и conference PTT в один понятный раздел «Микрофон / Speakers», как у IPC Speakers + Device

### Nice-to-have / позже

9. Admin Settings / Diagnostic Tool — отдельный админ-контур, не в user Settings MVP
10. Auto-answer intercom — только если в RTU есть аналог intercom auto-answer
11. Expansion Module brightness — нерелевантно без второго экрана

---

## Предлагаемая IA для дизайнера (черновик)

1. Профиль / аккаунт  
2. Основные (язык, обучение, reset — RTU)  
3. Поведение вызовов (уведомления, CLI, рингтоны по типу)  
4. Переадресация  
5. Медиа / устройства / громкости  
6. Микрофон / PTT / Goose  
7. Приоритизация и цвета  
8. Вкладки контактов  
9. Клавиши линий  
10. Система / диагностика  

---

## Короткий вывод

IPC Settings — это **7 пользовательских категорий** вокруг аккаунта, diversion, call handling UX, даты, device/volume, system info и speakers latch.

У нас сильнее **медиа/Goose, line keys, contact tabs, forwarding table, per-contact customize**.  
Слабее всего относительно IPC: **профиль/пароль, call handling (popup/CLI/priority ringtones), date-time, UI scale/volumes defaults, оформленный System Info**.

Для макетов WUI-5444 разумнее не копировать IPC 1:1, а закрыть must-have gaps и сохранить RTU-блоки.
