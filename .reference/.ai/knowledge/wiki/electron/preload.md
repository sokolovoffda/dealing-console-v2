# Electron preload

## Назначение

Preload — мост между renderer (Vue) и main: наружу только безопасный `window.electronAPI`, без прямого Node API в UI.

## Текущее понимание

Файл: `electron/preload.mjs` (`contextBridge.exposeInMainWorld`).

### Stand config API (WUI-5638)

```ts
electronAPI.getStandConfig(): Promise<StandConfig | null>
electronAPI.setStandConfig(config: StandConfig): Promise<StandConfig>
electronAPI.pingStandConfig(request: StandPingRequest): Promise<StandPingResult>
```

Типы в `src/env.d.ts` и `src/shared/stand-config/types.ts`.

Renderer-обёртки:

- `loadStandConfigFromElectron` / `persistStandConfig` — `shared/stand-config`
- `pingStand` — `features/electron-stand-setup` (только Electron)

### Правила

- Новые IPC для стенда не вызывать из renderer напрямую через `ipcRenderer` — только через preload API
- Ping и запись файла — ответственность main; preload только `invoke`

## Связанные страницы

- `ipc.md`
- `stand-config.md`

## Источники

- `electron/preload.mjs`
- `src/env.d.ts`
- `src/shared/stand-config/stand-config-runtime.ts`
- `src/features/electron-stand-setup/model/ping-stand.ts`
- `.ai/tasks/WUI-5638/case.md`

## Открытые вопросы

- нет по preload; админ-гейт смены адреса — часть 2 кейса
