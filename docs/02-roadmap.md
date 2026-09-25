# 02 — Roadmap

里程碑以「可驗收結果」為準。狀態定義見 [03-progress.md](03-progress.md)。

## M0 — 文件與 Repo

**範圍**

- AGENTS、docs/00–03、spec 10–11、README 索引
- 標清示範站 vs core 單租戶目標

**驗收**

- [ ] 文件齊備並可在本 repo `main` 查閱

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

- [ ] Auth 切片 `已接`
- [ ] 無 user／operator token 混用

## M3 — 主檔與訂單出貨

**範圍**

- SellableItem／inventory／PackagePlan／LabService
- Orders 列表／詳情／cancel／shipment
- Users 列表／詳情

**驗收**

- [ ] 至少一條主檔寫入與一條訂單讀或出貨推進 `已接`

## M4 — 報告校正與 weight set

**範圍**

- `PATCH`／`retry` admin health-reports
- `/admin/weight-sets/**`
- Operator CRUD（admin）

**驗收**

- [ ] 上列 in-scope 切片達 `已接` 或排程明確

## 明確不做（不進里程碑實作）

- 多租戶 `orgs`、`cases`、`labs` 排程、`selections`／`keyin`、顧問 `invoices`、`reviews`、履約 `progress`
- 為上述能力新增 core API

## Backlog

- OpenAPI codegen（admin yaml）
- 隱藏或移除「不做」示範頁

## 相關

- 進度：[03-progress.md](03-progress.md)
- core M8／spec 29
