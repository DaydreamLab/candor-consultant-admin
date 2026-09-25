# 03 — 開發進度

對應 [02-roadmap.md](02-roadmap.md)。

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

## 功能（使用者可見）

接線欄由下方 API 切片彙總。側欄對照見 [spec/10-screen-scope.md](spec/10-screen-scope.md)。

### In-scope

| 功能 | 路由／入口 | 畫面 | 接線 | 里程碑 |
|------|------------|------|------|--------|
| Operator 登入／目前身份 | `/login` | 殼 | Mock | M2 |
| 工作台 | `/` | 殼 | 不需 | —（勿依賴 case 聚合） |
| 商品與庫存 | `/products`、`/products/new`、`/products/[sku]` | 殼 | Mock | M3 |
| 出貨推進 | `/shipping`（語意 → shipment） | 殼 | Mock | M3 |
| 使用者列表／詳情 | `/users` | 殼 | Mock | M3 |
| 訂單列表／詳情／取消／讀對話 | — | 無 | Mock | M3 |
| PackagePlan 主檔 | — | 無 | Mock | M3 |
| LabService 主檔 | — | 無 | Mock | M3 |
| 報告校正／重試 | —（可掛設定） | 無 | Mock | M4 |
| Weight sets | —（可掛設定） | 無 | Mock | M4 |
| Operator CRUD／重設密碼 | —（可掛設定） | 無 | Mock | M4 |
| 代操去識別化 | —（可掛使用者／設定） | 無 | Mock | M4 |
| 設定頁 | `/settings` | 殼 | 不需 | —（可當 M4 入口） |
| 報告列表／詳情 | — | 無 | 不做 | — |

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
| 登入 | `POST /admin/auth/login` | Mock |
| 目前身份 | `GET /admin/me` | Mock |
| Operator CRUD／重設密碼 | `/admin/operators/**` | Mock |

### Users

| 能力 | 端點 | 狀態 |
|------|------|------|
| 列表／詳情 | `GET /admin/users`、`GET /admin/users/{id}` | Mock |
| 代操去識別化 | `DELETE /admin/users/{id}/data` | Mock |

### Sellable items／inventory／package plans

| 能力 | 端點 | 狀態 |
|------|------|------|
| SellableItem CRUD | `/admin/sellable-items`、`/admin/sellable-item/{id}` | Mock |
| Inventory 讀寫／alerts | `/admin/sellable-item/{id}/inventory`、`GET /admin/inventory/alerts` | Mock |
| PackagePlan CRUD | `/admin/package-plans`、`/admin/package-plan/{id}` | Mock |
| LabService CRUD | `/admin/lab-services`、`/admin/lab-service/{id}` | Mock |

### Orders／shipments

| 能力 | 端點 | 狀態 |
|------|------|------|
| 訂單列表／詳情 | `GET /admin/orders`、`GET /admin/order/{id}` | Mock |
| 讀訂單對話 | `GET /admin/order/{id}/message` | Mock |
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

**最後更新**：2026-09-25（新增功能表；Admin 全切片仍 Mock；文件 M0 就緒）
