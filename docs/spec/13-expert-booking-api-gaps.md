# Spec 13 — 專人預約 API 對齊缺口（admin）

對齊目標：candor-core PR [#155](https://github.com/DaydreamLab/candor-core/pull/155)（`cursor/expert-booking-station-fee2` @ `6e55db0c`）的 `docs/api/` OpenAPI 與 `docs/spec/34-expert-booking.md`。

## 環境存取失敗（原始錯誤）

本 Cloud Agent 環境僅掛載 `candor-consultant-admin`，**無法讀取** private `DaydreamLab/candor-core`：

```text
$ git clone … DaydreamLab/candor-core …
remote: Repository not found.
fatal: repository 'https://github.com/DaydreamLab/candor-core.git/' not found

$ gh pr view 155 --repo DaydreamLab/candor-core
GraphQL: Could not resolve to a Repository with the name 'DaydreamLab/candor-core'. (repository)

$ gh api repos/DaydreamLab/candor-core/contents/docs/spec/34-expert-booking.md?ref=cursor/expert-booking-station-fee2
{"message":"Not Found","documentation_url":"…","status":"404"}
gh: Not Found (HTTP 404)

$ curl/WebFetch raw.githubusercontent.com/…/34-expert-booking.md
Error fetching URL, status code: 404 Not Found
```

依規則不抽 token、不繞過。路徑／方法改以使用者訊息列出的端點對齊；**request／response 欄位名未核對 OpenAPI，下列為缺口**。

## 已對齊（路徑／方法）

見 `app/utils/expert-booking-api.ts` 檔頭註解。

## 缺口（勿自行假設；待可讀 core OpenAPI／spec 34 再改）

| 區域 | 缺口 |
|------|------|
| 列表／詳情 | 分頁 query、list／detail JSON 欄位、status／payment enum 字面值 |
| `POST …/cancel` | request body（空？）、錯誤碼 |
| `PUT …/product-picks`（admin／station） | body 根鍵與 item 欄位（現 mock／wire 暫用內部 `product_reasons`） |
| `PUT …/pin` | body 是否為 `{ pinned }` |
| `PUT …/last-seen` | body 形狀（現暫送 `{ booking_id }`）；是否回傳 last_seen 物件 |
| `GET …/conversations` | query（before／limit？）、訊息／對話 envelope |
| `PUT …/confirm-time` | body 欄位名（現暫送 `{ confirmed_at }`） |
| `PUT …/service-record` | 各欄位名（含 duration 分鐘） |
| `POST …/complete` | body／前置條件錯誤 |
| `GET/PUT/DELETE …/expert-calendar/**` | query、weekly／override body、專家色碼是否由 API 給 |
| 選品清單 | 是否另有 expert-booking 專用 catalog，或確認复用 sellable-items |

Mock UI 型別（`expert-booking-types.ts`）可繼續服務畫面；**接真 API 前必須用 core schema 重寫 parse／body**。
