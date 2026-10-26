# Spec 10 — 畫面範圍（in-scope vs 不做）

對照現有側欄（`app/utils/nav.ts`）與 [candor-core spec 29](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/29-admin-api.md)。訂單列表已接 `GET /admin/orders`；詳情、讀對話與報告判讀已接 `GET /admin/order/{id}`、`GET /admin/order/{id}/message`、`GET /admin/order/{id}/health-report`。會員列表／詳情已接 `GET /admin/users`、`GET /admin/users/{id}` 與子資源（訂單、對話、報告）。方案列表已接 `GET /admin/package-plans`（只顯示）。商品列表、單筆、建立、更新已接 sellable item；刪除按鈕呼叫的 `DELETE` core 未提供（停售走 `PATCH` `sale_status`）。庫存讀寫與 alerts、取消、出貨與其餘空殼路由尚未接 API。

未接／示範項：側欄選單文字右側、以及頂欄標題（或麵包屑最後一段）右側加「即將上線」badge（由 `layouts/default.vue` 統一處理，不在 `PageHeader` 內文）。側欄 section「開發中」組標籤仍用「開發中」。正式已上線頁不加 badge（含設定隱私 CMS、知識、專家訓練、AI 助理等）。正式組內未上線項目前僅物流進度（`shipping`）帶「即將上線」。

側欄掃描順序（Irice 2026-10-26）：**案件 → 知識 → 商品 → 設定 → 開發中**（每項只出現一次）。

## 側欄分組

### 案件（組 key: `ops`）

| Nav key | 路徑 | 範圍 | 接線說明 |
|---------|------|------|----------|
| reviews | `/expert-case-reviews`、`/expert-case-reviews/{id}` | **in-scope** | 專家檢視（真實案件主路徑）。不是 spec 不做的簽核 `reviews` |
| orders | `/orders`、`/orders/{id}` | **in-scope** | 列表已接 `GET /admin/orders`。詳情頁 `orders/[id].vue` 已接 `GET /admin/order/{id}`，對話已接 `GET /admin/order/{id}/message`，報告判讀已接 `GET /admin/order/{id}/health-report`。取消與出貨仍 Mock |
| shipping | `/shipping` | **in-scope（語意）** | 側欄標籤「物流進度」；未接線 → badge「即將上線」。→ 訂單 shipment 推進；勿另立 selection 出貨 API。勿與開發中「履約進度」`progress` 混淆 |
| users | `/users`、`/users/{id}` | **in-scope** | 僅 `role=member`。列表／詳情已接；子資源：訂單、對話列表／訊息、報告列表／判讀。點訂單進 `/orders/{id}`；對話與報告同頁展開 |

### 知識（組 key: `learning`）

| Nav key | 路徑 | 範圍 | 接線說明 |
|---------|------|------|----------|
| knowledge | `/knowledge/datasets`、`/knowledge/datasets/{id}`、`/knowledge/chunks`、`/knowledge/retrieval-preview`、`/knowledge/audit`、`/knowledge/dataset-groups`、`/knowledge/overview`、`/knowledge/config` | **in-scope** | 公開參考知識庫；直連 `GET`／`POST`／`PATCH /admin/knowledge/**`（見 [12-knowledge-management.md](12-knowledge-management.md)）。路由與程式用 knowledge，不用 rag。頁內 top tabs |
| expertTuning | `/expert-tuning`、`/expert-tuning/weights/{id}`、`/expert-tuning/daily-learning`、`/expert-tuning/training`、`/expert-tuning/training/{id}` | **in-scope（語意）** | 側欄在「知識」（與知識管理同組）。權重為列表點進詳情（本地 mock）。每日學習確認直連 `POST /admin/weight-sets/daily-learning-*`（ADR 0028／core #75；提案欄位 schema 待補）。訓練批次為本地 mock。不讀營運訂單／會員對話。不是簽核 `reviews` |

### 商品（組 key: `catalog`）

| Nav key | 路徑 | 範圍 | 接線說明 |
|---------|------|------|----------|
| packagePlans | `/package-plans` | **in-scope** | 列表已接 `GET /admin/package-plans`（只顯示）。建立、更新與單筆詳情仍 Mock（core 有 `GET /admin/package-plan/{id}`，畫面未呼叫；無刪除端點） |
| products | `/products`、`/products/new`、`/products/{id}` | **in-scope** | 列表／新增／更新已接 `sellable_item`。刪除打到 core 未提供的 `DELETE`。庫存讀寫與 alerts 仍 Mock。側欄標籤為「保健品」 |

### 設定（組 key: `system`）

| Nav key | 路徑 | 範圍 | 接線說明 |
|---------|------|------|----------|
| settings | `/settings` | 部分 | Operator 帳號可落此；勿做 org 設定。隱私權政策 CMS（`/admin/legal/privacy-policy**`，對齊 core #87）掛此；公開頁 `/privacy-policy` 免登入。頁內 left anchors；**無**「即將上線」badge |
| aiAssistant | `/ai-assistant` | **in-scope** | 站台／client config 等；**無** badge |

### 開發中（組 key: `developing`）

組標籤「開發中」；組內每項 badge「即將上線」。

| Nav key | 路徑 | 範圍 | 接線說明 |
|---------|------|------|----------|
| workbench | `/` | 示範殼 | 可改為訂單／庫存摘要；勿依賴 case 聚合 API |
| cases | `/cases` | **不做** | 履約單 → 改用訂單頁（`/admin/orders`）。勿與側欄組名「案件」或「專家檢視」混淆 |
| labs | `/labs` | **不做** | 案件式檢驗排程不採用（與下方 `labAppointments` 不同） |
| labAppointments | `/lab-appointments`、`/lab-appointments/{id}` | **in-scope（語意）** | 血檢／健檢預約記錄。本地 mock（列表／詳情／取消；列表含 7 天行事曆 modal）；無 HTTP。不是不做的 `labs` |
| progress | `/progress` | **不做**（範例頁） | 示範履約階段看板；產品保留討論用殼。勿改名為「物流進度」（正式物流見案件組 `shipping`） |
| labServices | `/lab-services`、`/lab-services/new`、`/lab-services/{id}` | **in-scope（語意）** | 採檢服務主檔（項目／必選／時段名額）。本地 mock，不打 `/admin/lab-services`。獨立選單，不從保健品新增進入；與不做的案件「採檢」`/labs` 不同 |
| selections | `/selections` | **不做** | keyin／手改組成不採用 |
| invoices | `/invoices` | **不做** | 顧問請款單不採用 |
| reports | `/reports` | 示範殼 | 非 core 報表 API；可留空或日後另開 ADR |
| orgs | `/orgs` | **不做** | 多租戶不建模；platformOnly |

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
| LabService 主檔 | `/admin/lab-services`（畫面 `/lab-services` 已 mock；非排程 `labs`） |
| LabAppointment | 無 HTTP（畫面 `/lab-appointments` 已 mock） |
| 報告校正 | admin health-reports PATCH／retry |
| Weight sets | `/admin/weight-sets/**` |
| Operators | `/admin/operators/**` |
| Knowledge（公開參考知識） | `/admin/knowledge/**`（見 [12-knowledge-management.md](12-knowledge-management.md)） |

## 相關

- Session／角色：[11-operator-session.md](11-operator-session.md)
- 知識管理：[12-knowledge-management.md](12-knowledge-management.md)
- 進度：[../03-progress.md](../03-progress.md)
