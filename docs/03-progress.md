# 03 — 開發進度

對應 [02-roadmap.md](02-roadmap.md)。

**里程碑總覽**：M0–M2 完成（示範站；operator 登入與 `GET /admin/me` 已接，無略過登入）；M3 進行中（商品讀寫、價格帶列表、訂單讀取已接）；M4 未開始。細項見下方勾選與功能表。

**同步規則**：本檔與 [candor-core docs/04-integration-progress.md](https://github.com/DaydreamLab/candor-core/blob/main/docs/04-integration-progress.md) 的 Admin 區必須一致。功能表的**接線**欄變更時，須與本檔下方 API 切片及 candor-core `04` 一起改；**畫面**欄只改本 repo。

## 狀態定義

### 接線

| 狀態 | 意涵 |
|------|------|
| `Mock` | 仍用前端假資料／本地 store，未打 core |
| `接線中` | 已開始改 `$fetch`／型別，尚未整段可驗收 |
| `已接` | 該切片對真 API 可走通，識別子為 core 詞 |
| `不做` | 明確不在範圍；不得改為其他狀態 |
| `不需` | 純前端、不打 core |

### 畫面

| 狀態 | 意涵 |
|------|------|
| `無` | 沒有路由／入口 |
| `殼` | 有頁但是示範資料、demo 徽章或只做導向 |
| `可用` | 正式旅程可操作 |

## M0 — 文件

- [x] AGENTS.md
- [x] docs/00–03、spec/10–11
- [x] README 文件索引

## M1 — 示範 Mock

- [x] 側欄與多角色示範登入
- [x] 履約／倉儲／請款／平台等 Mock 頁（含不做範圍的殼）

## M2 — Operator 登入直連

- [x] Auth 切片 `已接`（登入／目前身份畫面 `可用`）
- [x] 無 user／operator token 混用

## M3 — 主檔與訂單出貨

- [ ] 商品／庫存／出貨／使用者：殼改接達 `已接`
- [ ] 訂單、PackagePlan、LabService：LabService／預約已有 mock 頁；接線仍待 `已接`

## M4 — 報告校正與 weight set

- [ ] 報告校正／重試、weight sets、Operator CRUD、代操去識別化：有入口且接線 `已接` 或排程明確

## 功能（使用者可見）

接線欄由下方 API 切片彙總。側欄對照見 [spec/10-screen-scope.md](spec/10-screen-scope.md)。里程碑欄：`完成`＝已達；其餘為掛帳階段。

### In-scope

| 功能 | 路由／入口 | 畫面 | 接線 | 里程碑 |
|------|------------|------|------|--------|
| Operator 登入／目前身份 | `/login`（可用）；`/account` 唯讀可用（`GET /admin/me`） | 可用 | 已接 | M2 |
| 總覽 | `/` | 殼 | 不需 | 完成（殼；勿依賴 case 聚合） |
| 商品與庫存 | `/products`、`/products/new`、`/products/{id}`（列表／新增／更新已接；刪除打到 core 未提供的 `DELETE`；庫存讀寫與 alerts 仍 Mock） | 可用 | 接線中 | M3 |
| 出貨推進 | `/shipping`（語意 → shipment） | 殼 | Mock | M3 |
| 會員列表／詳情／訂單／對話／報告上傳 | `/users`、`/users/{id}`（列表與詳情已接；點訂單進 `/orders/{id}`；對話與報告同頁展開） | 可用 | 已接 | M3 |
| 訂單 | `/orders` | 可用 | 已接 | M3 |
| 訂單詳情／取消／讀對話／報告判讀 | `/orders/{id}`（詳情、對話與報告判讀可讀；取消、出貨仍 Mock） | 可用 | 接線中 | M3 |
| 銷售方案列表 | `/package-plans` | 可用 | 已接 | M3 |
| 銷售方案詳情／更新 | `/package-plans/{id}`（`GET`／`PATCH` 已接；無刪除端點） | 可用 | 已接 | M3 |
| PackagePlan 建立 | —（core 有 `POST /admin/package-plans`，畫面未做） | 無 | Mock | M3 |
| 採檢服務（LabService） | `/lab-services`、`/lab-services/new`、`/lab-services/{id}`（項目／必選／時段名額；本地 mock） | 可用 | Mock | M3 |
| 預約記錄 | `/lab-appointments`、`/lab-appointments/{id}`（列表／詳情／取消；列表有 7 天行事曆 modal；本地 mock） | 可用 | Mock | M3 |
| 報告校正／重試 | —（可掛設定） | 無 | Mock | M4 |
| 專家訓練／權重 | `/expert-tuning`、`/expert-tuning/weights/{id}`（側欄「平台」；列表點進詳情） | 殼 | Mock | M4 |
| 專家訓練／訓練批次 | `/expert-tuning/training`、`/expert-tuning/training/{id}` | 殼 | Mock | M4 |
| Weight sets | —（權重分頁仍 mock；HTTP 見 core） | 殼 | Mock | M4 |
| Operator CRUD／重設密碼 | —（可掛設定） | 無 | Mock | M4 |
| 代操去識別化 | —（可掛使用者／設定） | 無 | Mock | M4 |
| 設定頁 | `/settings` | 殼＋client-config | 已接（檢測更多外連） | 完成 |
| 報告列表／詳情 | — | 無 | 不做 | 不做 |

### 明確不做（示範頁可暫留）

| 功能 | 路由 | 畫面 | 接線 |
|------|------|------|------|
| 履約單 cases | `/cases` | 殼 | 不做 |
| 檢驗排程 labs | `/labs` | 殼 | 不做 |
| 履約看板 progress | `/progress` | 殼 | 不做 |
| 簽核 reviews | `/reviews` | 殼 | 不做 |
| selections／keyin | `/selections` | 殼 | 不做 |
| 顧問請款 invoices | `/invoices` | 殼 | 不做 |
| 多租戶 orgs | `/orgs` | 殼 | 不做 |
| 財務 reports | `/reports` | 殼 | 不做 |

## 接線切片（對齊 core 04；前綴 `/api/v1/admin`）

### Auth 與 operator

| 能力 | 端點 | 狀態 |
|------|------|------|
| 登入 | `POST /admin/auth/login` | 已接（`remember_me`；無示範帳號與略過登入） |
| 目前身份 | `GET /admin/me` | 已接 |
| Operator CRUD／重設密碼 | `/admin/operators/**` | Mock |

### Users（會員）

| 能力 | 端點 | 狀態 |
|------|------|------|
| 列表／詳情 | `GET /admin/users`、`GET /admin/users/{id}`（僅 `role=member`） | 已接 |
| 會員訂單 | `GET /admin/users/{id}/orders` | 已接 |
| 會員對話列表／訊息 | `GET /admin/users/{id}/conversations`、`GET /admin/users/{id}/conversation/{conversationId}/messages` | 已接 |
| 會員報告列表／判讀 | `GET /admin/users/{id}/health-reports`、`GET /admin/users/{id}/health-report/{reportId}` | 已接 |
| 代操去識別化 | `DELETE /admin/users/{id}/data` | Mock |

### Sellable items／inventory／package plans

| 能力 | 端點 | 狀態 |
|------|------|------|
| SellableItem 列表／建立／詳情／更新 | `GET`／`POST /admin/sellable-items`、`GET`／`PATCH /admin/sellable-item/{id}` | 已接（含列表上下架 toggle、風險／禁忌／尺寸／可同封裝欄位） |
| SellableItem 刪除 | `DELETE /admin/sellable-item/{id}` | 不做（詳情頁不提供刪除；停售走 `PATCH` `sale_status`） |
| Inventory 讀寫／alerts | `/admin/sellable-item/{id}/inventory`、`GET /admin/inventory/alerts` | Mock |
| PackagePlan 列表 | `GET /admin/package-plans` | 已接 |
| PackagePlan 單筆詳情／更新 | `GET`／`PATCH /admin/package-plan/{id}` | 已接（畫面 `/package-plans/{id}`；`period_days` 可改且須 > 0；UI 選項 30／60／90） |
| PackagePlan 建立 | `POST /admin/package-plans` | Mock（畫面未做；無刪除端點） |
| LabService CRUD | `/admin/lab-services`、`/admin/lab-service/{id}` | Mock（畫面 `/lab-services` 已做本地 mock；不打 API；目標欄位見 core ADR 0022） |
| LabAppointment 列表／詳情／取消 | —（無 HTTP） | Mock（畫面 `/lab-appointments` 含 7 天行事曆 modal；不是不做的 `/labs`） |
| Client config | `GET`／`PATCH /admin/client-config` | 已接（`/settings`） |

### Orders／shipments

| 能力 | 端點 | 狀態 |
|------|------|------|
| 訂單列表 | `GET /admin/orders` | 已接 |
| 訂單詳情 | `GET /admin/order/{id}` | 已接 |
| 讀訂單對話 | `GET /admin/order/{id}/message` | 已接 |
| 讀訂單報告判讀 | `GET /admin/order/{id}/health-report` | 已接 |
| 取消 | `POST /admin/order/{id}/cancel` | Mock |
| 出貨建立／推進 | `POST`／`PATCH /admin/order/{id}/shipment` | Mock |

### Health reports（校正）

| 能力 | 端點 | 狀態 |
|------|------|------|
| 校正結果 | `PATCH /admin/health-reports/{id}/results/{result_id}` | Mock |
| 重試擷取 | `POST /admin/health-reports/{id}/retry` | Mock |
| 列表／詳情 | `GET /admin/health-reports`、`GET /admin/health-reports/{id}` | 不做 |

### Weight sets

| 能力 | 端點 | 狀態 |
|------|------|------|
| 列表／建立／詳情／entries／dry-run／publish | `/admin/weight-sets/**` | Mock |
| 後台「專家訓練」權重分頁 | `/expert-tuning`（本地 mock，未呼叫 weight-set API） | Mock |
| 後台「專家訓練」訓練批次 | `/expert-tuning/training`（本地 mock；案例庫／模擬案例／review；無 HTTP） | Mock |

### 明確不做（示範頁可暫留）

| 參考能力 | 狀態 |
|----------|------|
| `orgs` 多租戶 | 不做 |
| `cases`（→ `order`） | 不做 |
| `labs`／檢驗排程 | 不做 |
| `selections`／`keyin` | 不做 |
| 顧問請款 `invoices` | 不做 |
| `reviews` 簽核 | 不做 |
| `progress` 履約看板 | 不做 |

### 命名改接

| 檢查項 | 狀態 |
|--------|------|
| 無 `staff`／`platform_*`／`consultant_*`（→ `operator`） | Mock |
| 無 `case`／`caseId`（→ `order`） | Mock |
| 無 `selection`／`keyIn`（→ `order_line`） | Mock |

---

**最後更新**：2026-10-05（與 candor-core `docs/04` Admin 區對齊。**Auth 切片已接**：`POST /admin/auth/login` 與 `GET /admin/me`；無示範帳號與略過登入；operator token 鍵 `candor.operator.token` 與前台 `candor.guest.token` 分開。銷售方案列表與詳情／更新已接（`period_days` 可改；UI 30／60／90）；建立仍 Mock。商品列表／新增／更新已接。訂單列表、詳情與對話已接。**會員列表／詳情／訂單／對話／報告**已接。**採檢服務／預約記錄**本地 mock。**專家訓練**權重與訓練批次皆為 mock）
