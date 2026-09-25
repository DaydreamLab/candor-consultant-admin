# 03 — 開發進度

對應 [02-roadmap.md](02-roadmap.md)。

**同步規則**：本檔與 [candor-core docs/04-integration-progress.md](https://github.com/DaydreamLab/candor-core/blob/main/docs/04-integration-progress.md) 的 Admin 區必須一致。接線狀態變更時兩邊一起改。

## 狀態定義

| 狀態 | 意涵 |
|------|------|
| `Mock` | 仍用前端假資料／本地 store，未打 core |
| `接線中` | 已開始改 `$fetch`／型別，尚未整段可驗收 |
| `已接` | 該切片對真 API 可走通，識別子為 core 詞 |
| `不做` | 明確不在範圍；不得改為其他狀態 |

## M0 — 文件

- [x] AGENTS.md
- [x] docs/00–03、spec/10–11
- [x] README 文件索引

## M1 — 示範 Mock

- [x] 側欄與多角色示範登入
- [x] 履約／倉儲／請款／平台等 Mock 頁（含不做範圍的殼）

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

**最後更新**：2026-09-25（Admin 全切片仍 Mock；文件 M0 就緒）
