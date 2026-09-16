# Media device overrides API

## Статус

**Implemented (WUI-5528 plan3 persist + plan4 runtime wire).**

## Назначение

Persist пользовательских правок карточек Media Devices (enabled, volume, AEC-триада) **per user + hardwareSerial**.

Список карточек UI = локальная сборка `devices-store`. Overrides мержатся по `logicalKey` (`device.id`; Main = `hub`).

## Endpoints

```text
GET   /api/v1/me/media-device-overrides/{hardwareSerial}
PATCH /api/v1/me/media-device-overrides/{hardwareSerial}
```

URL через `getAdditionalApiURL` (additional / APS backend). Dev proxy / deb nginx: `/api/v1/me/media-device-overrides`.

## Frontend

| Слой | Роль |
|------|------|
| `useMediaDeviceOverridesApi` | GET/PATCH client |
| `useMediaDeviceOverridesStore` | hydrate, working/synced, dirty, save-on-leave, Main volume debounce, AEC/`enabled` guards |
| `apply-override-to-logical-device` | map override → `LogicalMediaDevice` user fields |
| `MediaDeviceItem` | UI ↔ `patchDevice` / resolved override |
| `useTurretAdminWs().hardwareSerial` | path param |

### Persist paths

1. **Обычные overrides** (handset/goose/…): dirty working copy → `saveIfDirty()` на leave Settings / logout (`excludeMainVolume`).
2. **Main volume (`hub`)**: любое изменение `globalVolumeMultiplier` (Settings или footer) → **один** debounced PATCH (`logicalKey` + `volume`). На leave: `flushPendingMainVolumePersist()` затем общий save без повторного Main volume.

Orphans (override без локального устройства): храним, не рисуем, не delete.

### Runtime wire (plan4)

- Hydrate / `patchDevice` → `setUserMediaOverride` / `replaceUserMediaOverrides` в `devices-store` (карта переживает `rebuildDevices`).
- Поля на `LogicalMediaDevice`: `enabled`, `volume`, `echoCancellation`, `noiseSuppression`, `autoGainControl`.
- AEC-триада и non-Main volume: при bound sessions на устройстве — **блок + toast** `MediaDeviceChangeBlockedWhileInCall`.
- `enabled=false` при bound sessions — **блок + toast** `MediaDeviceDisableBlockedWhileInCall`.
- Main volume через GVM разрешён при сессиях (не mid-call getUserMedia).

## Связанные страницы

- `../domain/devices.md`
- `../domain/handsets.md`
- `goose-settings-api.md`
- `api-routing.md`
- `controller-ws.md`
- `turret-aps-ws.md`

## Источники

- `src/entities/media-devices-settings/model/use-media-device-overrides-store.ts`
- `src/entities/media-devices-settings/lib/apply-override-to-logical-device.ts`
- `src/entities/media-devices-settings/api/media-device-overrides-api.ts`
- `.ai/tasks/WUI-5528/api-contract.md`
- Уточнение пользователя от 2026-09-15 (Main volume + debounce; runtime wire / soft-disable)

## Открытые вопросы

- Нет по v1 persist + runtime wire (Q1/Q2 и plan4 продуктовые решения закрыты).
- Диалог переноса вызова с трубки при OFF — follow-up (v1 = блок+toast).
- `PreferencesReloadRequested` — вне скоупа WUI-5528.
