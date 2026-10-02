# Spec 10 — 畫面範圍（in-scope vs 不做）

對照現有側欄（`app/utils/nav.ts`）與 [candor-core spec 29](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/29-admin-api.md)。訂單列表已接 `GET /admin/orders`；詳情、讀對話與報告判讀已接 `GET /admin/order/{id}`、`GET /admin/order/{id}/message`、`GET /admin/order/{id}/health-report`。會員列表／詳情已接 `GET /admin/users`、`GET /admin/users/{id}` 與子資源（訂單、對話、報告）。方案列表已接 `GET /admin/package-plans`（只顯示）。商品列表、單筆、建立、更新已接 sellable item；刪除按鈕呼叫的 `DELETE` core 未提供（停售走 `PATCH` `sale_status`）。庫存讀寫與 alerts、取消、出貨與其餘空殼路由尚未接 API。

未接項目的選單文字與頁面標題後加「開發中」。側欄不加的只有 `orders`、`users`、`packagePlans`、`products`。頁面標題同樣不加的還有商品新增／詳情、會員詳情，以及側欄底部姓名進入的 `/account`。

## 側欄分組

### Ops（示範 key: `ops`）

| Nav key | 路徑 | 範圍 | 接線說明 |
|---------|------|------|----------|
| workbench | `/` | 示範殼 | 可改為訂單／庫存摘要；勿依賴 case 聚合 API |
| orders | `/orders`、`/orders/{id}` | **in-scope** | 列表已接 `GET /admin/orders`。詳情頁 `orders/[id].vue` 已接 `GET /admin/order/{id}`，對話已接 `GET /admin/order/{id}/message`，報告判讀已接 `GET /admin/order/{id}/health-report`。取消與出貨仍 Mock |
| users | `/users`、`/users/{id}` | **in-scope** | 僅 `role=member`。列表／詳情已接；子資源：訂單、對話列表／訊息、報告列表／判讀。點訂單進 `/orders/{id}`；對話與報告同頁展開 |
| cases | `/cases` | **不做** | 履約單 → 改用訂單頁（`/admin/orders`） |
| labs | `/labs` | **不做** | 檢驗排程不採用 |
| progress | `/progress` | **不做** | 履約看板不採用 |
| reviews | `/reviews` | **不做** | 簽核不採用 |

### Catalog（`catalog`，側欄「商品」）

| Nav key | 路徑 | 範圍 | 接線說明 |
|---------|------|------|----------|
| packagePlans | `/package-plans` | **in-scope** | 列表已接 `GET /admin/package-plans`（只顯示）。建立、更新與單筆詳情仍 Mock（core 有 `GET /admin/package-plan/{id}`，畫面未呼叫；無刪除端點） |
| products | `/products`、`/products/new`、`/products/{id}` | **in-scope** | 列表／新增／更新已接 `sellable_item`。刪除打到 core 未提供的 `DELETE`。庫存讀寫與 alerts 仍 Mock。側欄標籤為「保健品」 |

### Warehouse（`warehouse`）

| Nav key | 路徑 | 範圍 | 接線說明 |
|---------|------|------|----------|
| selections | `/selections` | **不做** | keyin／手改組成不採用 |
| shipping | `/shipping` | **in-scope（語意）** | → 訂單 shipment 推進；勿另立 selection 出貨 API |

### Finance（`finance`）

| Nav key | 路徑 | 範圍 | 接線說明 |
|---------|------|------|----------|
| invoices | `/invoices` | **不做** | 顧問請款單不採用 |
| reports | `/reports` | 示範殼 | 非 core 報表 API；可留空或日後另開 ADR |

### Platform（`platform`）

| Nav key | 路徑 | 範圍 | 接線說明 |
|---------|------|------|----------|
| orgs | `/orgs` | **不做** | 多租戶不建模 |
| expertTuning | `/expert-tuning`、`/expert-tuning/weights/{id}`、`/expert-tuning/training`、`/expert-tuning/training/{id}` | **in-scope（語意）** | 側欄在「平台」。權重為列表點進詳情；權重與訓練批次皆為本地 mock（見 [candor-core spec 15](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/15-expert-tuning.md) 訓練批次）。不讀營運訂單／會員對話。不是 `/reviews` 簽核 |
| settings | `/settings` | 部分 | Operator 帳號可落此；勿做 org 設定 |

### 側欄底部（不在 `NAV_GROUPS`）

| 入口 | 路徑 | 範圍 | 接線說明 |
|------|------|------|----------|
| 姓名 | `/account` | **in-scope** | 唯讀可用，標題「目前帳號」。接 `GET /admin/me`；登出仍在姓名旁 |

## 建議新增（尚無獨立 nav）

接線時應有畫面或設定入口（可掛 settings 或新 nav）。訂單列表、詳情、讀對話與報告判讀已接；會員列表／詳情／訂單／對話／報告已接；方案列表已接且只顯示。取消、出貨，以及 `package_plan` 寫入與單筆詳情仍未做：

| 能力 | Core |
|------|------|
| 訂單詳情／取消／讀對話／報告判讀 | `/admin/order/{id}`（`/orders/{id}` 可讀詳情、對話與報告判讀；取消、出貨仍 Mock） |
| PackagePlan 詳情／寫入 | `/admin/package-plan/{id}`（列表已接 `GET /admin/package-plans`，只顯示） |
| LabService 主檔 | `/admin/lab-services`（商品化血檢，非排程 `labs`） |
| 報告校正 | admin health-reports PATCH／retry |
| Weight sets | `/admin/weight-sets/**` |
| Operators | `/admin/operators/**` |

## 相關

- Session／角色：[11-operator-session.md](11-operator-session.md)
- 進度：[../03-progress.md](../03-progress.md)
