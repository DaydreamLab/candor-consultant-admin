# Spec 13 — 專人預約 API 對齊缺口（admin）

對齊目標：candor-core PR [#155](https://github.com/DaydreamLab/candor-core/pull/155) head `27901b4` 的 `docs/spec/34-expert-booking.md` 與 bundled `public/api/docs/openapi-admin.yaml`（本環境以使用者附檔為準）。

## 已對齊（本 repo）

路徑／方法／主要 request／response 欄位已依 OpenAPI @ `27901b4` 寫入 `app/utils/expert-booking-types.ts`、`app/utils/expert-booking-api.ts` 與相關畫面：

| 區域 | 對齊內容 |
|------|----------|
| 列表 | `data.expert_bookings`＋`total`（station 另有 `last_seen_booking_id`）；query `status`／`q`／`limit`／`offset` |
| 詳情 | `contact_*`、`preferred_slots: string[]`、`requirement_note`、`attachments`、`confirmed_starts_at`／`ends_at`、`product_picks`、`member_profile`、`service_record` |
| status | `awaiting_schedule` \| `scheduled` \| `completed` \| `cancelled` |
| cancel | `POST …/cancel` body `{ reason? }` |
| product-picks | `PUT` body `{ product_picks: [{ sellable_item_id?, sellable_item_code?, reason }] }` → `{ product_picks }` |
| pin | `{ pinned }` → `{ booking_id, pinned }` |
| last-seen | `{ booking_id }` |
| conversations | `conversations[]`＋`total`；query `limit`／`offset` |
| confirm-time | `{ confirmed_starts_at, confirmed_ends_at? }` |
| service-record | 必填 `served_at`／`service_method`／`content`；`sales_content` 空→「無」；選填 duration／sales_result／deal_amount／follow_up／attachments；回傳含 `filled_by_operator_id`／`filled_at` |
| attachments | `POST …/attachments` multipart `file` → attachment meta，再帶入 service-record |
| calendar GET | `weekly`／`day_overrides`／`scheduled_bookings`／`experts`；query `from`／`to`／`expert_operator_id?` |
| weekly PUT | `{ expert_operator_id, slots: [{ weekday, slot_start_minute }] }` |
| day-override PUT／DELETE | body 用 `expert_operator_id`＋`override_date`（DELETE 亦為 body，非 query） |

## 仍不一致／待接真 API 再驗

| 區域 | 缺口 |
|------|------|
| 選品清單 | OpenAPI 無專用 catalog；FE 暫复用 `GET /sellable-items`。core 若另有路徑需改。 |
| 專家色碼 | calendar `experts[]` 無 `color`；FE 本地 palette 著色。 |
| 列表 last-seen 展示 | API 只回 `last_seen_booking_id`；專家站列表另 GET 詳情補 order_no／姓名（非契約欄位）。 |
| live 錯誤碼 | 409／422 等文案與前端對應尚未對真 API 驗收（mock 僅覆蓋常見路徑）。 |
| 前台會員 API | 不在本後台範圍（`/expert-booking-product`、會員下單等）。 |

Mock 預設仍開（`NUXT_PUBLIC_EXPERT_BOOKING_MOCK`）；接真 API 時關 mock 並以 core 環境驗證。
