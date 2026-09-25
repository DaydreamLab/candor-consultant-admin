# 02 — Roadmap

里程碑以「可驗收結果」為準。畫面／接線狀態與功能表見 [03-progress.md](03-progress.md)。

## M0 — 文件與 Repo

**範圍**

- AGENTS、docs/00–03、spec 10–11、README 索引
- 標清示範站 vs core 單租戶目標

**驗收**

- [x] 文件齊備並可在本 repo `main` 查閱

## M1 — 示範 Mock UI

**範圍**

- Nuxt 4 後台殼、側欄、多角色示範登入、主檔與履約等 Mock 頁

**驗收**

- [x] GitHub Pages 示範站可操作
- [x] 示範角色可切換

## M2 — Operator 登入直連

**範圍**

- `POST /admin/auth/login`、`GET /admin/me`
- operator token 儲存與 API client
- 示範角色對照表落地為 `expert`／`ops`／`admin`（或明確映射後刪除舊角色）

**驗收**

- [ ] Auth 切片 `已接`（功能表：登入／目前身份畫面達 `可用`、接線 `已接`）
- [ ] 無 user／operator token 混用

## M3 — 主檔與訂單出貨

**範圍**

- 既有殼改接：SellableItem／inventory（`/products`）、出貨推進（`/shipping` → shipment）、Users（`/users`）
- **補頁**（目前功能表畫面 `無`）：訂單列表／詳情／取消／讀對話、PackagePlan、LabService

**驗收**

- [ ] 至少一條主檔寫入與一條訂單讀或出貨推進：畫面 `可用`、接線 `已接`
- [ ] 功能表上列 in-scope 項畫面不再為 `無`（訂單、價格帶、血檢主檔已有入口）

## M4 — 報告校正與 weight set

**範圍**

- `PATCH`／`retry` admin health-reports（畫面可掛設定）
- `/admin/weight-sets/**`（畫面可掛設定）
- Operator CRUD（admin；畫面可掛設定）
- 代操去識別化（可掛使用者／設定）

**驗收**

- [ ] 上列功能表列畫面達 `可用`（或掛定入口），接線達 `已接` 或排程明確

## 明確不做（不進里程碑實作）

- 多租戶 `orgs`、`cases`、`labs` 排程、`selections`／`keyin`、顧問 `invoices`、`reviews`、履約 `progress`、財務示範 `reports`
- 為上述能力新增 core API
- 報告列表／詳情（core 尚未實作）

## Backlog

- OpenAPI codegen（admin yaml）
- 隱藏或移除「不做」示範頁

## 相關

- 進度與功能表：[03-progress.md](03-progress.md)
- core M8／spec 29
