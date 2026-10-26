# Spec 12 — 知識管理（Knowledge）

對照 [candor-core spec 29](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/29-admin-api.md) 與 **契約權威**：

| 來源 | 用途 |
|------|------|
| `config/common/routes.php` | 路由與 HTTP 方法（repo 內） |
| [openapi-admin.yaml](https://candor-core.dev.daydream-lab.com/api/docs/openapi-admin.yaml) | 請求／回應欄位、查詢參數、`x-required-roles` |
| [Swagger 文件站](https://candor-core.dev.daydream-lab.com/api/docs/index.html) | 人類可讀對照 |

本專案 HTTP 前綴：`/api/v1/admin/knowledge/**`（`app/utils/admin-api.ts` 的 `adminUrl` 會再接 `/admin`）。路由與程式識別子一律用 **knowledge**，禁止 **rag** 作為路由或 UI 契約名稱（後端資料表名不在此規範）。

Session／錯誤 envelope：見 [11-operator-session.md](11-operator-session.md)。成功 `{ status: "success", data: … }`；失敗 `{ status: "failed", error_message, error_code?, error_data? }`，由 `AdminApiError` 讀 `error_message`。

## 範圍

**in-scope**：公開參考知識庫（corpus `public_knowledge`）的資料集、片段審核、檢索預覽、稽核、群組 registry、總覽與設定檢視。

**非目標（本 spec 不做 UI／不接線）**：

- 會員對話路徑的檢索（`POST /conversation/{id}/messages` 內部步驟）
- 顧問判讀知識（`expert-case-review/.../knowledge`；ADR 0025）
- 知識缺口收集後台（`GET /admin/knowledge/gaps*`；Beta 後、另 spec）
- 觸發匯入／重嵌／成本與健康儀表（進階卡）

## 角色與權限

**後台 UI（本 repo，Irice 10/21）**：知識管理（含片段審核）僅 **ops／admin**。側欄／選單隱藏 expert 入口；`/knowledge/**` 由 `knowledge.global` middleware 導回首頁。片段 approve／reject 按鈕僅 ops／admin。

與 candor-core 權限對齊（core 另 PR：知識管理 API、chunks 列表、approve／reject 皆限 admin／ops；expert → 403；審核權限由 expert＋admin 改為 ops＋admin）。**合併順序：先合 core 權限 PR，再合本後台 PR。**

| 能力 | expert | ops | admin |
|------|--------|-----|-------|
| 進入知識管理 UI／讀取子頁 | — | ✓ | ✓ |
| 寫入：chunks approve／reject | — | ✓ | ✓ |
| 寫入：datasets PATCH（code／name／授權／status） | — | ✓ | ✓ |
| 寫入：dataset-groups POST | — | — | ✓ |

未登入或 member JWT：401。角色不足：403。

## 頁面清單與優先順序

側欄掛在 **知識** 群組（組 key `learning`；與專家訓練同組），主入口 `/knowledge`（子頁見下表）。子導覽模式可對齊 `AiAssistantTabs`（水平 Tab）。

| 優先 | 頁面 | 路由 | 主要 API | 里程碑 |
|------|------|------|----------|--------|
| P1 | 資料集列表 | `/knowledge/datasets` | `GET /knowledge/datasets` | KM1 |
| P1 | 資料集詳情 | `/knowledge/datasets/{id}` | `GET`／`PATCH /knowledge/datasets/{id}` | KM1 |
| P1 | 片段審核 | `/knowledge/chunks` | `GET /knowledge/chunks`；`POST …/approve`／`reject` | KM1 |
| P2 | 檢索預覽 | `/knowledge/retrieval-preview` | `POST /knowledge/retrieval-preview` | KM2 |
| P2 | 稽核 | `/knowledge/audit` | `GET /knowledge/audit`；`GET /knowledge/audit/chunks/{id}`；`GET /knowledge/audit/datasets/{id}` | KM2 |
| P3 | 資料集群組 | `/knowledge/dataset-groups` | `GET`／`POST /knowledge/dataset-groups` | KM3 |
| P3 | 總覽 | `/knowledge/overview` | `GET /knowledge/overview` | KM3 |
| P3 | 設定 | `/knowledge/config` | `GET /knowledge/config` | KM3 |

**KM1／KM2／KM3** 對應實作 PR 批次；進度見 [../03-progress.md](../03-progress.md)。

### P1 — 資料集列表

- 查詢參數（OpenAPI `adminKnowledgeDatasets`）：`group`、`status`（`pending_review`｜`active`｜`disabled`）、`corpus`、`code`（精確比對）。
- 列表欄位（`data[]`）：`id`、`code`、`name`、`corpus`、`status`、`group_key`（若有）、`document_count`、`chunk_count` 等。是否外送由環境的 embedding 設定決定，後台不設定（core 將移除資料集欄位 `allow_third_party`／`allow_in_account_managed`）。
- 點列進詳情。空列表：`EmptyPanel` + 說明尚無資料集。
- 錯誤：載入失敗顯示 `error_message` 或 i18n 預設；401 由 auth middleware 處理。

### P1 — 資料集詳情

- 讀取：`GET /knowledge/datasets/{id}`（404 → 詳情錯誤、無表單）。
- 可編輯（僅 **ops／admin**；**expert → 403**）：`PATCH` body（OpenAPI `adminKnowledgeDatasetPatch`）：
  - `code`：pattern `^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$`；大寫或非法字元 → **422**（不自動轉小寫）
  - `name`
  - `license`、`license_url`、`attribution`（可 `null` 清除）
  - `status`：`pending_review`｜`active`｜`disabled`（非法轉換 → **409**）
  - `reason`：選填；**status 變更**時寫入 `knowledge_dataset.status_change` 稽核
- `code` 衝突 → **409**。成功後以回應 `data` 刷新畫面。
- **授權／出處**：表單區塊獨立於代碼／名稱；`source_url` 若 API 有回傳則唯讀連結展示（PATCH 未在 OpenAPI 列出則不可改）。
- ops／admin 可 PATCH（與知識管理 UI 角色一致）；若未來要限 admin 改 status，需 core 先改。

### P1 — 片段審核

- 列表：`GET /knowledge/chunks`；查詢參數：**`group`**（`group_key` 須存在 registry）、**`status`**（`draft`｜`pending`｜`approved`｜`rejected`｜`retired`；非法 → **422**）、**`limit`**（預設 50；UI 固定送頁大小，**禁止**用極大 `limit` 假裝全量）、**`offset`**（跳過 N 筆；core 落地前可忽略，前端仍須帶上並以「本批筆數 ≥ limit」判斷是否還有下一頁）。**待 candor-core／契約**：`dataset_id`、OpenAPI 與實作對齊、`offset`／來源欄位正式入契約；回應是否保證完整 `text` 或僅 `text_preview` 亦待明確化。
- **預設篩選**：`/knowledge/chunks` 與資料集詳情片段面板預設 **`status=pending`**（可改為全部或其他狀態後重打 API）。
- **分頁**：以 API `limit`＋`offset`「載入更多」累加列；不得只對單次回傳做 client 假分頁當全庫翻頁。
- **資料集詳情**（`/knowledge/datasets/{id}`）：有 `group_key` 時以 `group`（＋選用 `status`、`limit`、`offset`）查詢後 **client** 依 `dataset_id`／`dataset_code` 篩選顯示；同一套 API offset 載入更多。
- **頁面標題**：知識子頁以 `KnowledgeTabs` **路由**切換；頂欄與瀏覽器 title 由 `usePageCrumbs`／`knowledge-nav`（`nav.knowledge` + tab 標籤）與 `useAdminPageHead` 同步，勿依 `NAV_GROUPS` 的 `to: /knowledge/datasets` 單點比對。
- UI 狀態篩選變更時重打 API（帶 `status`，`offset` 歸零）；勿只對已載入列做 client filter 冒充狀態篩選。
- 列欄位（依 `data[]` 實際鍵）：片段 `id`、所屬資料集、`review_status`、文件標題、`text` 預覽；**`source_url`／`license`／`attribution` 有回傳才顯示**（core 尚未補齊前可為缺省／`null`，UI 須容忍）。摘要片段標「摘要（衍生）」若 `chunk_kind`／類似欄位存在。
- **approve**：`POST /knowledge/chunks/{id}/approve`（ops／admin）。**reject**：`POST /knowledge/chunks/{id}/reject`（摘要寫「原因必填」；OpenAPI 未宣告 body — **待確認** `reason` 欄位名與 422 規則，UI 仍應強制填原因再送出）。
- 409：狀態機衝突；404：片段不存在。成功後更新該列或重新載入。
- 空狀態：一般「沒有符合的片段」；勿再顯示「與 beta 全數 approved 一致」類誤導說明。

### P2 — 檢索預覽

- **禁止**前端 rate limit（後端已有全站限流）。
- 請求（`adminKnowledgeRetrievalPreview`）：
  - 必填：`corpus` = `public_knowledge`、`query`
  - 選填：`mode` = `keyword`｜`vector`｜`hybrid`（預設建議 `hybrid`）、`top_k`、`filters`（object）
- 回應 `data`（OpenAPI 寬型別；實作對齊 core `docs/ops/35-knowledge-retrieval-quality.md`、`docs/ops/38-nutrient-key-minimal-design.md`）：
  - `hits[]`：每筆可含 `scores`／`ranks`（hybrid 時 keyword RRF 等）
  - `query_info.detected_nutrients`：查詢端偵測到的成分／`nutrient_key` 列表（標籤＋顯示名）；無則空陣列或省略
  - `knowledge_gap`：可為 `null` 或物件；當守門判定結果不足時帶警告（與對話檢索同一語意，**非**「知識缺口收集」資料表功能）

#### `knowledge_gap` 顯示（檢索預覽）

| `reason` | 含義（UI 文案方向） | 顯示方式 |
|----------|---------------------|----------|
| `no_matching_hits` | 偵測到庫外或守門後無可用命中 | 結果區空或極少 hits；**醒目提示**（warning）說明無匹配，並列出 `query_info.detected_nutrients`（若有） |
| `insufficient_multi_nutrient_hits` | 多成分查詢但命中成分數不足（例如少於 2） | warning；列出已偵測成分與實際命中成分對照（依 `data` 內欄位，常見為 `detected_nutrients` vs hit 標籤） |
| `partial_multi_nutrient_hits` | 多成分僅部分有命中 | warning；**仍顯示已有 hits** |

**B 群 `partial_multi_nutrient_hits`**：當查詢為 B 群（複合維生素 B）且僅部分 B 成員有片段（例如只命中 B6）時，除一般 partial 提示外，加註「B 群僅部分命中」說明，避免營運誤判為完整 B 群覆蓋。文案用 i18n key `knowledge.retrievalPreview.gap.partialBComplex`（實作時撰寫）。

422：例如非法 `mode`。403／401：同前。

### P2 — 稽核

- 全域：`GET /knowledge/audit` — 合併 `rag_chunk_reviews`（`source=chunk_review`）與 `admin_audit_log`（`knowledge_dataset.*`、`knowledge_dataset_group.create`）。查詢：`from`／`to`（ISO date-time；預設最近 30 日；單次窗 ≤90 日）、`action`、`actor_id`、`limit`（≤100，預設 50）、`offset`。
- 片段：`GET /knowledge/audit/chunks/{id}` — `limit` ≤500。
- 資料集：`GET /knowledge/audit/datasets/{id}` — 同全域篩選；chunk 列 `id` 為整數、admin 列 `id` 為 UUID（OpenAPI 描述）。
- UI：表格 `source`、`level`、`action`、`actor`、`created_at`；不含片段全文。空狀態：時間窗內無事件。
- 422：時間窗非法。

### P3 — 資料集群組

- 列表：`GET /knowledge/dataset-groups` — registry 與各群組 dataset 數。
- 新增：**admin only** — `POST` body：`group_key`（pattern `^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$`）、`display_name`、`reason`（必填）、`sort_order` 選填。201 成功；409 衝突；422 驗證失敗。
- 內建群組（ods／fda／tfda／hpa／other）由後端 seed；UI 區分系統預設與自訂。

### P3 — 總覽與設定

- **overview**：`GET /knowledge/overview` — 各資料集彙總、全庫片段／文件計數等（`data` 寬型別；KM3 依 live 回應排版）。
- **config**：`GET /knowledge/config` — embedding 供應商、模型、維度、`active_space` 等；**不得**顯示 API key，僅「已設定／未設定」。`default_review_mode` 若嵌在 dataset 層則在資料集頁展示。是否外送由環境的 embedding adaptor 決定，後台不設定。

## API 一覽（`/api/v1/admin`）

| 方法 | 路徑 | operationId | 角色 |
|------|------|-------------|------|
| GET | `/knowledge/chunks` | adminKnowledgeChunksList | ops, admin |
| POST | `/knowledge/chunks/{id}/approve` | adminKnowledgeChunksApprove | ops, admin |
| POST | `/knowledge/chunks/{id}/reject` | adminKnowledgeChunksReject | ops, admin |
| GET | `/knowledge/overview` | adminKnowledgeOverview | ops, admin |
| GET | `/knowledge/dataset-groups` | adminKnowledgeDatasetGroupsList | ops, admin |
| POST | `/knowledge/dataset-groups` | adminKnowledgeDatasetGroupsCreate | admin |
| GET | `/knowledge/datasets` | adminKnowledgeDatasets | ops, admin |
| GET | `/knowledge/datasets/{id}` | adminKnowledgeDatasetDetail | ops, admin |
| PATCH | `/knowledge/datasets/{id}` | adminKnowledgeDatasetPatch | ops, admin |
| GET | `/knowledge/config` | adminKnowledgeConfig | ops, admin |
| POST | `/knowledge/retrieval-preview` | adminKnowledgeRetrievalPreview | ops, admin |
| GET | `/knowledge/audit` | adminKnowledgeAuditGlobal | ops, admin |
| GET | `/knowledge/audit/chunks/{id}` | adminKnowledgeAuditChunk | ops, admin |
| GET | `/knowledge/audit/datasets/{id}` | adminKnowledgeAuditDataset | ops, admin |

## 前端實作慣例

- API client：擴充 `app/utils/admin-api.ts`（`AdminApiError`、`adminUrl`、解析 `data`）。
- 頁面：`app/pages/knowledge/**`；型別可放 `app/types/knowledge.ts`（接線 PR 引入）。
- i18n：`knowledge.*`（zh-TW／en）。
- `isDevelopingPath`／`nav.ts`：知識管理接線完成前標「即將上線」；完成後對已完成子路由設 `developing: false`（對齊 orders／ai-assistant）。
- 錯誤：列表／詳情分離；可重試載入。403 顯示無權限，不清 session。

## 相關

- 畫面範圍：[10-screen-scope.md](10-screen-scope.md)
- 進度：[../03-progress.md](../03-progress.md)
- Core 串接看板：[candor-core docs/04](https://github.com/DaydreamLab/candor-core/blob/main/docs/04-integration-progress.md)（知識切片新增時須雙寫）
