# FSD-структура учебного приложения

## Назначение

Зафиксировать принятую раскладку слоёв Feature-Sliced Design в `dealing-console-v2` после LEARN-002.

## Слои (направление зависимостей сверху вниз)

```text
app → pages → widgets → features → entities → shared
```

| Слой       | Роль сейчас                                   |
| ---------- | --------------------------------------------- |
| `app`      | композиция приложения (`App.vue`, public API) |
| `pages`    | страницы; есть слайс `home`                   |
| `widgets`  | пусто (позже панели пульта)                   |
| `features` | пусто                                         |
| `entities` | пусто                                         |
| `shared`   | пусто                                         |

Точка входа `src/main.ts` остаётся тонкой: монтирует `App` из `@/app`.

## Public API

- Слайс экспортирует наружу только через свой `index.ts`.
- Снаружи слайса: `@/pages/home`, не `@/pages/home/ui/HomePage.vue`.
- Внутри слайса относительные импорты `./ui/...` — норма.

## Алиас `@/`

- Vite: `resolve.alias` в `vite.config.ts`
- TypeScript: `paths` в `tsconfig.app.json`

Оба места должны совпадать, иначе runtime и IDE расходятся.

## Отличия от референса

- Пока нет Pinia, Vue Router, `@wui/*`, i18n.
- UI-тексты на русском в коде.
- Слои заведены вручную поверх чистого Vite (LEARN-001 → LEARN-002).

## Источники

- `.ai/tasks/LEARN-002-fsd-skeleton/`
- Уточнения пользователя от 2026-09-16 / 2026-09-18
- Ориентир имён слоёв: `.reference/src/`
