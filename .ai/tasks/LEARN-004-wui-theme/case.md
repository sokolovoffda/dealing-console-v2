# LEARN-004 — WUI theme + первая кнопка

## Исходная задача

Подключить `@wui/common-library`: тема (как в проде, упрощённо), Tailwind при необходимости, одна рабочая `WuiBtn` на Home с русским текстом и токеном `wrkspc-*`. Без i18n.

## Уточнения пользователя

- Планы крупнее (меньше шагов).
- Тексты на русском в коде.
- Код пишет разработчик.

## Ограничения

- Не тащить `@wui/im`, `@wui/jssip`, turret-lib, полный generate-theme pipeline референса — только минимум, чтобы UI Kit ожил.
- Версию `@wui/common-library` взять близко к референсу (`2.1.0-alpha.26` или согласованный актуальный alpha из registry).
- Установка через уже существующий корневой `.npmrc` (GitLab `@wui` registry). Не светить токены в чате/доках.

## Связанные материалы

- `.reference/src/main.ts` — `bootstrapStyles({ theme: 'lsDark-1' })`
- `.reference/src/app/assets/styles/index.css` — tailwind + foundation/palette + theme
- `.reference/vite.config.ts` — `@tailwindcss/vite`
- `.reference/package.json` — версии WUI / tailwind
- Skill: `wui-common-library` (при наличии MCP — смотреть доки; иначе референс)
