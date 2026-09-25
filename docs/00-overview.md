# 00 — 專案總覽

## 問題定義

營運與領域專家需要在後台維護商品／庫存／價格帶、處理訂單出貨、校正報告與發布權重。本 app 是 **商家後台**（operator 端），不是客人端。

評分、訂單真相與 admin API 在 **candor-core**；本專案負責畫面與（目前）示範 Mock。

## 現況 vs 目標

| | 現況（示範站） | 目標（對接 core） |
|--|----------------|-------------------|
| 租戶 | 多顧問公司 Mock（`orgs`） | **單租戶**起步；不做多租戶 UI 契約 |
| 身份 | cookie 示範角色切換 | `POST /admin/auth/login` → operator JWT |
| 角色 | `platform_*`／`consultant_*` | `expert`｜`ops`｜`admin` |
| 資料 | `utils/demo.ts` 記憶體 | `/api/v1/admin/**` |

## 目標

- Operator 登入與帳號管理（admin）。
- SellableItem／inventory／PackagePlan／LabService 主檔。
- 訂單列表／詳情、出貨推進、取消、讀訂單對話。
- 健康報告校正與重試；weight set 草稿／dry-run／publish。
- Users 檢視與（admin）代操去識別化。

## 非目標（對齊 candor-core spec 29）

- `orgs` 多租戶營運
- `cases` 履約單（改用 `order`）
- `labs` 檢驗排程
- `selections`／`keyin` 手改組成（組成為建單快照）
- 顧問請款 `invoices`
- `reviews` 簽核
- 履約 `progress` 看板
- 客人端聊天／建議排序 UI

## 使用者角色（目標）

| 角色 | 需求 |
|------|------|
| `expert` | 報告校正、weight set |
| `ops` | 商品／庫存／package、訂單與出貨、users 讀 |
| `admin` | 以上 + operator 帳號、代操去識別化 |

示範角色對照見 [spec/11-operator-session.md](spec/11-operator-session.md)。

## 名詞（摘要）

完整對照：[candor-core spec 10](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/10-domain-model.md)。

| 舊示範詞 | Core |
|----------|------|
| staff／platform_*／consultant_* | `operator` |
| case | `order` |
| selection／keyIn | `order_line`（快照不可手改） |
| product（SKU） | `sellable_item` |
| plan = basic｜mid｜premium | 不採用；用 `package_plan` |

## 成功指標（初期）

| 指標 | 目標 |
|------|------|
| [docs/03](03-progress.md) | Auth 與至少一條主檔或訂單寫入路徑 `已接` |
| 範圍 | 「不做」頁不得對接假 API |
| 命名 | 接線合併後無長期禁止識別子 |

## 相關

- 架構：[01-architecture.md](01-architecture.md)
- 路線圖：[02-roadmap.md](02-roadmap.md)
- 進度：[03-progress.md](03-progress.md)
- 畫面範圍：[spec/10-screen-scope.md](spec/10-screen-scope.md)
- Session：[spec/11-operator-session.md](spec/11-operator-session.md)
