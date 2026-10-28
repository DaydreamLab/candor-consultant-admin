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
- [x] docs/00–03、spec/10–12
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
| 總覽 | `/`（側欄最上；stats-first 待辦／狀態；舊履約 `<details>` 收合） | 可用 | 已接（Wave-1：既有 list 長度累加；無新 overview／count API） | M3 |
| 商品與庫存 | `/products`、`/products/new`、`/products/{id}`（列表／新增／更新已接；刪除打到 core 未提供的 `DELETE`；庫存讀寫與 alerts 仍 Mock） | 可用 | 接線中 | M3 |
| 出貨推進 | `/shipping`（語意 → shipment；列表／詳情讀取接 core #88 `shipments`／訂單 `shipment_id`，空／不可用回落 mock；推進／新增／刪除仍 Mock） | 可用 | 接線中 | M3 |
| 會員列表／詳情／訂單／對話／報告上傳 | `/users`、`/users/{id}`（列表與詳情已接；點訂單進 `/orders/{id}`；對話與報告同頁展開） | 可用 | 已接 | M3 |
| 訂單 | `/orders` | 可用 | 已接 | M3 |
| 訂單詳情／取消／讀對話／報告判讀／退款／發票 | `/orders/{id}`（詳情、對話與報告判讀可讀；整筆退款與發票重試已接；「在物流進度查看」深連結已接；取消仍 Mock） | 可用 | 接線中 | M3 |
| 金流設定 | `/settings`（radio：模擬金流 (sandbox)／藍新金流 (newebpay)；按儲存） | 可用 | 已接 | Beta-a |
| 電子發票設定 | `/settings`（radio：模擬發票 (sandbox)／ezPay (ezpay)；按儲存） | 可用 | 已接 | Beta-a |
| 報告判讀 LLM 上限 | `/settings`（每次讀取最多 LLM 次數；留空＝不限制；按儲存） | 可用 | 接線中（待 [candor-core #81](https://github.com/DaydreamLab/candor-core/pull/81) 合併部署） | M4 |
| 隱私權政策 CMS | `/settings/privacy`（Markdown 編輯／儲存；左右版本 diff；自設定總頁錨點拆出）；公開頁 `/privacy-policy`；Cookie 同意依 version | 可用 | 接線中（待 [candor-core #87](https://github.com/DaydreamLab/candor-core/pull/87) 合併部署） | M2 Beta |
| CTA 目錄 | `/settings/cta-catalog`（列表／編輯／情境矩陣；自設定總頁錨點拆出；無新增／刪除；admin 可編、ops 只讀、expert 隱藏側欄項） | 可用 | Mock（client 已備；待 candor-core CTA catalog Admin API；預設 `NUXT_PUBLIC_CTA_CATALOG_MOCK` 開） | M3 |
| 銷售方案列表 | `/package-plans` | 可用 | 已接 | M3 |
| 銷售方案詳情／更新 | `/package-plans/{id}`（`GET`／`PATCH` 已接；無刪除端點） | 可用 | 已接 | M3 |
| PackagePlan 建立 | —（core 有 `POST /admin/package-plans`，畫面未做） | 無 | Mock | M3 |
| 採檢服務（LabService） | `/lab-services`、`/lab-services/new`、`/lab-services/{id}`（項目／必選／時段名額；本地 mock） | 可用 | Mock | M3 |
| 預約記錄 | `/lab-appointments`、`/lab-appointments/{id}`（列表／詳情／取消；列表有 7 天行事曆 modal；本地 mock） | 可用 | Mock | M3 |
| 報告校正／重試 | —（可掛設定） | 無 | Mock | M4 |
| 專家訓練／權重 | `/expert-tuning`、`/expert-tuning/weights/{id}`（側欄「平台」；列表點進詳情） | 殼 | Mock | M4 |
| 專家訓練／每日學習確認 | `/expert-tuning/daily-learning`（載入待確認草案／clone→confirm→confirm-safety→dry-run→publish；對齊 core #76 `79ed13b`；ops 可確認） | 可用 | 接線中（待 core #76 合併部署） | M4 |
| 專家訓練／訓練批次 | `/expert-tuning/training`、`/expert-tuning/training/{id}` | 殼 | Mock | M4 |
| Weight sets | —（權重分頁仍 mock；每日學習 HTTP 已接畫面；見 core #75） | 殼／接線中 | Mock／接線中 | M4 |
| Operator CRUD／重設密碼 | —（可掛設定） | 無 | Mock | M4 |
| 代操去識別化 | —（可掛使用者／設定） | 無 | Mock | M4 |
| 設定頁 | `/settings`（錨點：支付｜發票｜報告判讀｜其他；隱私／CTA 已拆獨立頁） | 殼 | 殼 | 完成 |
| AI 助理／對話文案 | `/ai-assistant` | 可用 | 已接（conversation-copies） | 完成 |
| AI 助理／採檢建議連結 | `/ai-assistant/site` | 可用 | 已接（client-config） | 完成 |
| AI 助理／合規詞庫 | `/ai-assistant/claim-terms` | 可用 | 已接（claim-guard-terms） | 完成 |
| 專家檢視／定稿對話文案 | `/expert-case-reviews/{id}` 方案／權重下方獨立卡（產生兩段 MD、左右並排編輯、cache soft chip、dirty 覆蓋確認、定稿鎖定） | 可用 | 接線中（待 [candor-core #103](https://github.com/DaydreamLab/candor-core/pull/103)；本機可 `NUXT_PUBLIC_EXPERT_FINALIZE_COPY_MOCK=1`） | M3 |
| 知識管理／資料集 | `/knowledge/datasets`、`/knowledge/datasets/{id}` | 可用 | 接線中 | KM1 |
| 知識管理／片段審核 | `/knowledge/chunks` | 可用 | 接線中 | KM1 |
| 知識管理／檢索預覽 | `/knowledge/retrieval-preview` | 可用 | 接線中 | KM2 |
| 知識管理／稽核 | `/knowledge/audit`、`/knowledge/audit/chunks/{id}`、`/knowledge/audit/datasets/{id}` | 可用 | 接線中 | KM2 |
| 知識管理／群組 | `/knowledge/dataset-groups` | 可用 | 接線中 | KM3 |
| 知識管理／總覽與設定 | `/knowledge/overview`、`/knowledge/config` | 可用 | 接線中 | KM3 |
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
| SellableItem 列表／建立／詳情／更新 | `GET`／`POST /admin/sellable-items`、`GET`／`PATCH /admin/sellable-item/{id}` | 已接（含列表上下架 toggle、風險／禁忌／包裝佔用容量 (單顆)／可同封裝；`unit_size_text` 已刪；表單已對齊） |
| SellableItem 刪除 | `DELETE /admin/sellable-item/{id}` | 不做（詳情頁不提供刪除；停售走 `PATCH` `sale_status`） |
| Inventory 讀寫／alerts | `/admin/sellable-item/{id}/inventory`、`GET /admin/inventory/alerts` | Mock |
| PackagePlan 列表 | `GET /admin/package-plans` | 已接（列表顯示包裝總容量／固定核心數量） |
| PackagePlan 單筆詳情／更新 | `GET`／`PATCH /admin/package-plan/{id}` | 已接（畫面 `/package-plans/{id}`；`period_days`／包裝總容量／固定核心數量可改；天數 UI 選項 30／60／90） |
| PackagePlan 建立 | `POST /admin/package-plans` | Mock（畫面未做；無刪除端點） |
| LabService CRUD | `/admin/lab-services`、`/admin/lab-service/{id}` | Mock（畫面 `/lab-services` 已做本地 mock；不打 API；目標欄位見 core ADR 0022） |
| LabAppointment 列表／詳情／取消 | —（無 HTTP） | Mock（畫面 `/lab-appointments` 含 7 天行事曆 modal；不是不做的 `/labs`） |
| Client config | `GET`／`PATCH /admin/client-config` | 已接（`/ai-assistant/site`；設定頁不再編） |
| Conversation copies | `GET /admin/conversation-copies`、`PATCH /admin/conversation-copy/{code}` | 已接（`/ai-assistant`） |
| Claim guard terms | `GET`／`POST /admin/claim-guard-terms`、`PATCH /admin/claim-guard-term/{id}` | 已接（`/ai-assistant/claim-terms`） |

### Expert case reviews

| 能力 | 端點 | 狀態 |
|------|------|------|
| 列表／詳情／品項決定／送出／匯出 | `GET /expert-case-reviews`、`GET`／`PATCH`／`POST …/expert-case-review/{id}/**` | 已接 |
| 定稿對話文案產生 | `POST /expert-case-review/{id}/finalize-copy/generate`（`force`；回 `report_highlights`／`expert_opinion`／`content_hash`／`cache_hit`） | 接線中（待 core #103；本機 mock 旗標可開） |
| 送出定稿帶兩段文案 | `POST …/submit` 可選 `report_highlights`／`expert_opinion` | 接線中（待 core #103） |

### Orders／shipments

| 能力 | 端點 | 狀態 |
|------|------|------|
| 訂單列表 | `GET /admin/orders` | 已接 |
| 訂單詳情 | `GET /admin/order/{id}` | 已接 |
| 讀訂單對話 | `GET /admin/order/{id}/message` | 已接 |
| 讀訂單報告判讀 | `GET /admin/order/{id}/health-report` | 已接 |
| 取消 | `POST /admin/order/{id}/cancel` | Mock |
| 整筆退款 | `POST /admin/order/{id}/refund` | 已接（訂單詳情） |
| 發票重試 | `POST /admin/order/{id}/invoice/retry` | 已接（訂單詳情） |
| 金流設定 | `GET`／`PATCH /admin/payment-settings` | 已接（設定頁 radio：模擬金流 (sandbox)／藍新金流 (newebpay)；按儲存才寫入） |
| 電子發票設定 | `GET`／`PATCH /admin/invoice-settings` | 已接（設定頁 radio：模擬發票 (sandbox)／ezPay (ezpay)；按儲存才寫入） |
| 報告判讀 LLM 上限 | `GET`／`PATCH /admin/biomarker-interpretation-settings`（`max_llm_calls_per_read`；`null`／空／0＝不限制） | 接線中（待 core #81） |
| 隱私權政策 | `GET /legal/privacy-policy`（公開）；`GET`／`PATCH /admin/legal/privacy-policy`；`GET …/versions`、`GET …/versions/{version}`（PATCH 僅 ops／admin；expert 403） | 接線中（待 core #87；設定頁左右並排 client-side diff；本機截圖可用 `NUXT_PUBLIC_PRIVACY_POLICY_MOCK=1`） |
| CTA 目錄 | `GET`／`PATCH /admin/cta-catalog`、`GET`／`PATCH /admin/cta-catalog/{type}`、`GET`／`PATCH /admin/cta-catalog/situation-matrix`（對齊 [candor-core #98](https://github.com/DaydreamLab/candor-core/pull/98)；無 create／delete；寫入僅 admin） | Mock（client 路徑已對齊；待 core 合併部署後關 mock） |
| 出貨列表／詳情 | `GET /admin/shipments`、`GET /admin/shipment/{id}`（core #88；不可用時由訂單 `shipment_id`／巢狀 `shipment` 回落；再空則 mock） | 接線中 |
| 出貨建立／推進 | `POST`／`PATCH /admin/order/{id}/shipment` | Mock |

### Health reports（校正）

| 能力 | 端點 | 狀態 |
|------|------|------|
| 校正結果 | `PATCH /admin/health-reports/{id}/results/{result_id}` | Mock |
| 重試擷取 | `POST /admin/health-reports/{id}/retry` | Mock |
| 列表／詳情 | `GET /admin/health-reports`、`GET /admin/health-reports/{id}` | 不做 |

### Knowledge（公開參考知識庫）

| 能力 | 端點 | 狀態 |
|------|------|------|
| 片段列表 | `GET /admin/knowledge/chunks` | 接線中 |
| 片段核可／退回 | `POST /admin/knowledge/chunks/{id}/approve`、`…/reject` | 接線中 |
| 總覽 | `GET /admin/knowledge/overview` | 接線中 |
| 資料集群組 | `GET`／`POST /admin/knowledge/dataset-groups` | 接線中 |
| 資料集列表／詳情／更新 | `GET`／`PATCH /admin/knowledge/datasets`、`GET /admin/knowledge/datasets/{id}` | 接線中 |
| 設定 | `GET /admin/knowledge/config` | 接線中 |
| 檢索預覽 | `POST /admin/knowledge/retrieval-preview` | 接線中 |
| 稽核 | `GET /admin/knowledge/audit`、`GET /admin/knowledge/audit/chunks/{id}`、`GET /admin/knowledge/audit/datasets/{id}` | 接線中（含全域列表與 chunks／datasets 專頁） |

### Weight sets

| 能力 | 端點 | 狀態 |
|------|------|------|
| 列表／建立／詳情／entries／dry-run／publish | `/admin/weight-sets/**` | Mock |
| 每日學習草案／確認／安全確認 | `POST …/daily-learning-*`；`GET /weight-sets`／`{id}`（#76：`daily_learning_pending`／`is_daily_learning_draft`／頂層 `daily_learning`） | 接線中（待 core #76 合併部署） |
| 後台「專家訓練」權重分頁 | `/expert-tuning`（本地 mock，未呼叫 weight-set API） | Mock |
| 後台「專家訓練」每日學習確認 | `/expert-tuning/daily-learning`（載入草案＋確認；ops 停用 clone／dry-run／publish） | 接線中（待 core #76 合併部署） |
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

**最後更新**：2026-10-28（專家檢視定稿對話文案獨立卡；消費 core #103 finalize-copy）

- 2026-10-28：專家案件詳情「定稿對話文案」獨立卡（四態；generate／submit 帶兩段 MD；cache_hit soft chip；dirty 覆蓋確認）。接線待 core #103；`docs/04` 請雙寫
- 2026-10-28：設定組側欄＝設定｜隱私權｜CTA 目錄｜AI 助理；路由 `/settings`｜`/settings/privacy`｜`/settings/cta-catalog`；總頁錨點僅支付｜發票｜報告判讀｜其他；空 hash 不強制 replace；expert 隱藏 CTA 側欄項。core `docs/04` 路徑敘述請雙寫
- 2026-10-27：CTA client 路徑對齊 core #98（`situation-matrix`）；設定 left anchors＋列表／編輯／矩陣 UI；仍 Mock 至 core 部署；`docs/04` 待雙寫
- 2026-10-27：設定頁 left anchors（支付｜發票｜報告判讀｜隱私｜**CTA 目錄**｜其他）；CTA 列表／編輯／情境矩陣 UI；mock client；core Admin API 與 `docs/04` 待雙寫
- 2026-10-27：總覽移出開發中→側欄最上（無 badge）；`/` Wave-1 接專家檢視／訂單／會員／知識片段 list count；舊履約示範收合；勿新 overview API。core `docs/04` 對應「總覽」列請同步為已接（沿用既有 list 端點）
- 2026-10-24：設定頁隱私權政策編輯、左右版本 diff、公開 `/privacy-policy`、Cookie 同意鍵 `candor.privacy.consent.version`；接線待 core #87
- 2026-10-21：draft PR #20；對齊 #76；合須等 core #76 部署
- 2026-10-21：修 listError／applyLoadedDraft 清紅字；重拍 ops_*

**KM 里程碑**：KM1 資料集＋片段審核；KM2 檢索預覽＋稽核；KM3 群組＋overview／config。細項見 [spec/12-knowledge-management.md](spec/12-knowledge-management.md)。
