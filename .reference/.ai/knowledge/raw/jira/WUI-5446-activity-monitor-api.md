# WUI-5446 — Activity Monitor API (from user, 2026-08-26)

Source: user message in chat + Jira comment (Сергей Митричев) + dealing-admin commit mention.

## Endpoints (additional backend)

### GET /api/v1/me/activity-monitor
Response 200:
```json
{
  "schemaVersion": 1,
  "subscriptions": [
    { "contactGuid": "string", "order": 0 }
  ]
}
```

### POST /api/v1/me/activity-monitor/subscriptions
Body: `{ "contactGuid": "string", "order": 0 }`
Response 200: same subscription object
409: already exists or order occupied

### PUT /api/v1/me/activity-monitor/subscriptions
Body: `{ "subscriptions": [{ "contactGuid": "string", "order": 0 }] }`
Response 200: full panel

### PUT /api/v1/me/activity-monitor/subscriptions/reorder
Body: `{ "fromOrder": 0, "toOrder": 0 }`
Response 200: full panel

### DELETE /api/v1/me/activity-monitor/subscriptions/{contactGuid}
Response 204

## Notes

- Positions like fast-dial / ПБВ (`order` as cell index).
- UI grid size from Figma mock: 24 cells (6×4); confirm vs ПБВ 36.
