# Spec 10 — 畫面範圍（in-scope vs 不做）

對照現有側欄（`app/utils/nav.ts`）與 [candor-core spec 29](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/29-admin-api.md)。空殼路由尚未接 API。

未接項目的選單文字與頁面標題後加「開發中」。側欄不加的只有 `orders`、`packagePlans`、`products`。頁面標題同樣不加的還有商品新增／詳情，以及側欄底部姓名進入的 `/account`。

## 側欄分組

### Ops（示範 key: `ops`）

| Nav key | 路徑 | 範圍 | 接線說明 |
|---------|------|------|----------|
| workbench | `/` | 示範殼 | 可改為訂單／庫存摘要；勿依賴 case 聚合 API |
| orders | `/orders` | **in-scope** | 空殼。對 `order`：`GET /admin/orders`（尚未接） |
| cases | `/cases` | **不做** | 履約單 → 改用訂單頁（`/admin/orders`） |
| labs | `/labs` | **不做** | 檢驗排程不採用 |
| progress | `/progress` | **不做** | 履約看板不採用 |
| reviews | `/reviews` | **不做** | 簽核不採用 |

### Warehouse（`warehouse`）

| Nav key | 路徑 | 範圍 | 接線說明 |
|---------|------|------|----------|
| products | `/products`、`/products/new`、`/products/[sku]` | **in-scope** | → SellableItem＋inventory |
| packagePlans | `/package-plans` | **in-scope** | 空殼。對 `package_plan`：`/admin/package-plans`（尚未接） |
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
| users | `/users` | **in-scope** | → `GET /admin/users` |
| settings | `/settings` | 部分 | Operator 帳號／權重入口可落此；勿做 org 設定 |

### 側欄底部（不在 `NAV_GROUPS`）

| 入口 | 路徑 | 範圍 | 接線說明 |
|------|------|------|----------|
| 姓名 | `/account` | **in-scope** | 空殼，標題「目前帳號」。不接 `GET /admin/me`；登出仍在姓名旁 |

## 建議新增（尚無獨立 nav）

接線時應有畫面或設定入口（可掛 settings 或新 nav）。訂單與 `package_plan` 已有空殼路由，詳情與寫入仍未做：

| 能力 | Core |
|------|------|
| 訂單詳情／取消／讀對話 | `/admin/order/{id}`（列表空殼在 `/orders`） |
| PackagePlan 詳情／寫入 | `/admin/package-plan/{id}`（列表空殼在 `/package-plans`） |
| LabService 主檔 | `/admin/lab-services`（商品化血檢，非排程 `labs`） |
| 報告校正 | admin health-reports PATCH／retry |
| Weight sets | `/admin/weight-sets/**` |
| Operators | `/admin/operators/**` |

## 相關

- Session／角色：[11-operator-session.md](11-operator-session.md)
- 進度：[../03-progress.md](../03-progress.md)
